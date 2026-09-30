import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                c.*,
                CASE 
                    WHEN t.op IS NOT NULL THEN 'asignado'
                    ELSE c.estatus
                END AS estatus
            FROM admin_costura_cortes c
            LEFT JOIN (
                SELECT DISTINCT op 
                FROM operador_tiempos_costura
            ) t ON c.op = t.op
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