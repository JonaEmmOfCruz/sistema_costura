import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                o.*, 
                c.estatus AS estado,
                pt.tiempo AS tiempo_base
            FROM admin_costura_ordenes o
            LEFT JOIN admin_costura_cortes c ON o.id = c.orden_id
            LEFT JOIN productos_tiempos pt ON o.producto = pt.codigo
            WHERE c.estatus IS NULL OR c.estatus = 'corte en proceso'
            ORDER BY o.id ASC
        `)

        return NextResponse.json({
            success: true,
            ordenes: rows
        })
    } catch (error) {
        console.error('Error al obtener las ordenes de produccion', error)
        return NextResponse.json(
            { success: false, message: 'Error interno al consultar las ordenes' },
            { status: 500 }
        )
    }
}