import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

// Evita que Next.js guarde en caché las respuestas GET
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                t.id,
                t.rq,
                t.op,
                t.producto,
                t.nombre,
                t.cantidad_asignada,
                t.id_operador,
                COALESCE(u.nombre, t.id_operador) AS nombre_operador,
                t.fecha_inicio,
                t.fecha_fin,
                t.tiempo_segundos,
                t.creado_en
            FROM operador_tiempos_costura t
            LEFT JOIN usuarios u ON t.id_operador = u.id
            ORDER BY t.id DESC
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