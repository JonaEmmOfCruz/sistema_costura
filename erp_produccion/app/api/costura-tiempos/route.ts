import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

// Evita que Next.js guarde en caché las respuestas GET
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT
                MAX(t.id) AS id,
                MAX(t.rq) AS rq,
                t.op,
                t.producto,
                MAX(t.nombre) AS nombre,
                MAX(t.cantidad_asignada) AS cantidad_asignada,
                t.id_operador,
                COALESCE(u.nombre, t.id_operador) AS nombre_operador,
                MIN(t.fecha_inicio) AS fecha_inicio,
                CASE
                    WHEN SUM(CASE WHEN t.fecha_fin IS NULL THEN 1 ELSE 0 END) > 0 THEN NULL
                    ELSE MAX(t.fecha_fin)
                END AS fecha_fin,
                CASE
                    WHEN SUM(CASE WHEN t.fecha_fin IS NULL THEN 1 ELSE 0 END) > 0 THEN NULL
                    ELSE SUM(COALESCE(t.tiempo_segundos, TIMESTAMPDIFF(SECOND, t.fecha_inicio, t.fecha_fin)))
                END AS tiempo_segundos,
                MAX(t.creado_en) AS creado_en,
                MAX(pt.t_costura) * MAX(t.cantidad_asignada) AS tiempo_sugerido_segundos
            FROM operador_tiempos_costura t
            LEFT JOIN usuarios u ON t.id_operador = u.id
            LEFT JOIN productos_tiempos pt ON t.producto = pt.cod_proceso
            GROUP BY t.id_operador, t.op, t.producto
            ORDER BY MAX(t.id) DESC
        `);

        return NextResponse.json({
            success: true,
            tiempos: rows
        });
    } catch (error) {
        console.error('Error al obtener los tiempos de costura', error);
        return NextResponse.json(
            { success: false, message: 'Error interno al consultar los tiempos' },
            { status: 500 }
        );
    }
}