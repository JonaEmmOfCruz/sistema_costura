import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { RowDataPacket } from 'mysql2'
import { tiempoCosturaPorPrefijoSql } from '@/lib/productosTiempos'

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
                ${tiempoCosturaPorPrefijoSql('a')} AS tiempo_base,
                COALESCE(${tiempoCosturaPorPrefijoSql('a')}, 0) * a.cantidad_asignada AS tiempo_sugerido_segundos,
                COALESCE(t.segundos_acumulados, 0) AS segundos_acumulados,
                CAST(UNIX_TIMESTAMP(t.inicio_sesion) * 1000 AS UNSIGNED) AS inicio_sesion_ms,
                CAST(UNIX_TIMESTAMP(NOW(3)) * 1000 AS UNSIGNED) AS server_now_ms
            FROM admin_costura_asignaciones a
            LEFT JOIN manuales_produccion m ON a.producto LIKE CONCAT(SUBSTRING_INDEX(m.nombre_original, '.', 1), '%')
            LEFT JOIN (
                SELECT
                    id_asignacion,
                    id_operador,
                    op,
                    MAX(CASE WHEN fecha_fin IS NULL THEN cantidad_asignada END) AS cantidad_sesion_abierta,
                    SUM(
                        CASE
                            WHEN id_asignacion IS NULL OR fecha_fin IS NULL THEN 0
                            ELSE COALESCE(tiempo_segundos, TIMESTAMPDIFF(SECOND, fecha_inicio, fecha_fin))
                        END
                    ) AS segundos_acumulados,
                    MAX(CASE WHEN fecha_fin IS NULL THEN fecha_inicio END) AS inicio_sesion,
                    GREATEST(
                        0,
                        COALESCE(
                            TIMESTAMPDIFF(
                                MICROSECOND,
                                MAX(CASE WHEN fecha_fin IS NULL THEN fecha_inicio END),
                                NOW(3)
                            ) / 1000000,
                            0
                        )
                    ) AS segundos_sesion_actual
                FROM operador_tiempos_costura
                WHERE id_operador = ?
                GROUP BY id_asignacion, id_operador, op
            ) t ON t.id_asignacion = a.id
                OR (
                    t.id_asignacion IS NULL
                    AND t.inicio_sesion IS NOT NULL
                    AND t.id_operador = a.id_operador
                    AND t.op = a.op
                    AND t.cantidad_sesion_abierta = a.cantidad_asignada
                )
            WHERE a.id_operador = ? 
              AND (a.estatus IN ('asignado', 'pausado') OR a.estatus IS NULL)
            ORDER BY CASE WHEN a.estatus = 'pausado' THEN 1 ELSE 0 END, a.id DESC
        `, [id_operador, id_operador])

        return NextResponse.json({ 
            success: true, 
            asignaciones: rows
        })
    } catch (error) {
        console.error('Error al obtener asignaciones del operador:', error)
        return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
    }
}
