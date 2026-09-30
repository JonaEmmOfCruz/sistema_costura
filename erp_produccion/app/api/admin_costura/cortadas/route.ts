import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
    try {
        // SOLUCIÓN 3: Sumar lo asignado para verificar si la orden ya se asignó completamente
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                c.*,
                CASE 
                    WHEN COALESCE(a.total_asignado, 0) >= c.cantidad THEN 'asignado'
                    WHEN c.estatus = 'asignado' THEN 'asignado'
                    ELSE c.estatus
                END AS estatus
            FROM admin_costura_cortes c
            LEFT JOIN (
                SELECT op, SUM(cantidad_asignada) as total_asignado 
                FROM admin_costura_asignaciones
                GROUP BY op
            ) a ON c.op = a.op
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