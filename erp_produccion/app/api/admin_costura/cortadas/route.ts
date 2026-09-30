import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT c.* 
            FROM admin_costura_cortes c
            WHERE c.estatus = 'cortada' 
            AND c.orden_id NOT IN (SELECT DISTINCT orden_id FROM admin_costura_asignaciones)
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