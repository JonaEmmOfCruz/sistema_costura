import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id_operador = searchParams.get('id_operador')

        if (!id_operador) {
            return NextResponse.json({ success: false, message: 'ID de operador requerido' }, { status: 400 })
        }

        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT
                a.*,
                m.ruta AS manual_ruta,
                m.tipo AS manual_tipo,
                m.nombre_original AS manual_nombre,
                pt.t_costura AS tiempo_base,
                COALESCE(pt.t_costura, 0) * a.cantidad_asignada AS tiempo_sugerido_segundos,
                COALESCE(t.segundos_acumulados, 0) AS segundos_acumulados,
                CAST(UNIX_TIMESTAMP(t.inicio_sesion) * 1000 AS UNSIGNED) AS inicio_sesion_ms
            FROM admin_costura_asignaciones a
            LEFT JOIN manuales_produccion m ON a.producto LIKE CONCAT(SUBSTRING_INDEX(m.nombre_original, '.', 1), '%')
            LEFT JOIN productos_tiempos pt ON a.producto = pt.cod_proceso
            LEFT JOIN (
                SELECT
                    id_operador,
                    op,
                    SUM(
                        CASE
                            WHEN fecha_fin IS NULL THEN 0
                            ELSE COALESCE(tiempo_segundos, TIMESTAMPDIFF(SECOND, fecha_inicio, fecha_fin))
                        END
                    ) AS segundos_acumulados,
                    MAX(CASE WHEN fecha_fin IS NULL THEN fecha_inicio END) AS inicio_sesion
                FROM operador_tiempos_costura
                GROUP BY id_operador, op
            ) t ON t.id_operador = a.id_operador AND t.op = a.op
            WHERE a.id_operador = ? 
              AND (a.estatus IN ('asignado', 'pausado') OR a.estatus IS NULL)
            ORDER BY CASE WHEN a.estatus = 'pausado' THEN 1 ELSE 0 END, a.id DESC
        `, [id_operador])

        return NextResponse.json({ 
            success: true, 
            asignaciones: rows
        })
    } catch (error) {
        console.error('Error al obtener asignaciones del operador:', error)
        return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
    }
}