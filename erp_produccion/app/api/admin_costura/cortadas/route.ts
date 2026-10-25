import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { tiempoCosturaPorPrefijoSql } from "@/lib/productosTiempos";
import { pageMetadata, pageRows, readPageParams } from "@/lib/pagination";
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
    try {
        const { page, pageSize, offset } = readPageParams(request)
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                c.*,
                COALESCE(a.total_asignado, 0) AS total_asignado, -- EXPORTAMOS EL NÚMERO AL FRONTEND
                CASE 
                    WHEN COALESCE(a.total_asignado, 0) >= c.cantidad THEN 'asignado'
                    WHEN c.estatus = 'asignacion parcial' THEN 'asignacion parcial'
                    ELSE c.estatus
                END AS estatus,
                ${tiempoCosturaPorPrefijoSql('c')} AS tiempo_base,
                o.prioridad
            FROM admin_costura_cortes c
            LEFT JOIN admin_costura_ordenes o ON c.orden_id = o.id
            LEFT JOIN (
                SELECT orden_id, SUM(cantidad_asignada) as total_asignado 
                FROM admin_costura_asignaciones
                GROUP BY orden_id
            ) a ON COALESCE(c.orden_id, c.id) = a.orden_id -- JOIN MÁS SEGURO POR ID
            ORDER BY c.id DESC
            LIMIT ? OFFSET ?
        `, [pageSize + 1, offset])

        return NextResponse.json({
            success: true,
            ordenes: pageRows(rows, pageSize),
            pagination: pageMetadata(page, pageSize, rows.length)
        })
    } catch (error) {
        console.error('Error al obtener las ordenes cortadas', error)
        return NextResponse.json(
            { success: false, message: 'Error interno al consultar las ordenes cortadas' },
            { status: 500 }
        )
    }
}
