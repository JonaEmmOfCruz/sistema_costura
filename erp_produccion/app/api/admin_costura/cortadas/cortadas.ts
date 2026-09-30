import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                c.*,
                CASE 
                    WHEN t.id IS NOT NULL THEN 'asignado'
                    ELSE c.estatus
                END AS estatus
            FROM admin_costura_cortes c
            LEFT JOIN (
                SELECT DISTINCT op, orden_id 
                FROM operador_tiempos_costura
            ) t ON (c.op = t.op OR c.orden_id = t.orden_id OR c.id = t.orden_id)
            ORDER BY c.id DESC
        `)

        return NextResponse.json({
            success: true,
            ordenes: rows
        })
    } catch (error) {
        console.error('Error al obtener las ordenes cortadas', error)
        return NextResponse.json(
            { success: false, message: 'Error interno al consultar las ordenes cortadas' },
            { status: 500 }
        )
    }
}