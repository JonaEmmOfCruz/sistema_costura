import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                c.*,
                COALESCE(a.total_asignado, 0) AS total_asignado, -- EXPORTAMOS EL NÚMERO AL FRONTEND
                CASE 
                    WHEN COALESCE(a.total_asignado, 0) >= c.cantidad THEN 'asignado'
                    WHEN c.estatus = 'asignacion parcial' THEN 'asignacion parcial'
                    ELSE c.estatus
                END AS estatus,
                pt.tiempo AS tiempo_base,
                o.prioridad
            FROM admin_costura_cortes c
            LEFT JOIN admin_costura_ordenes o ON c.orden_id = o.id
            LEFT JOIN (
                SELECT orden_id, SUM(cantidad_asignada) as total_asignado 
                FROM admin_costura_asignaciones
                GROUP BY orden_id
            ) a ON COALESCE(c.orden_id, c.id) = a.orden_id -- JOIN MÁS SEGURO POR ID
            LEFT JOIN productos_tiempos pt ON c.producto = pt.codigo
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