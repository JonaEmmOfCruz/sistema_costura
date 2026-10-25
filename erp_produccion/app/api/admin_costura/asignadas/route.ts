import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pageMetadata, pageRows, readPageParams } from "@/lib/pagination";
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { page, pageSize, offset } = readPageParams(request)
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT * FROM admin_costura_asignaciones
             WHERE estatus IS NULL OR LOWER(estatus) NOT IN ('completado', 'terminado', 'entregado')
             ORDER BY id DESC LIMIT ? OFFSET ?`,
            [pageSize + 1, offset]
        )

        return NextResponse.json({
            success: true,
            asignadas: pageRows(rows, pageSize),
            pagination: pageMetadata(page, pageSize, rows.length)
        })
    } catch (error) {
        console.error('Error al obtener los registros de corte', error)
        return NextResponse.json(
            { success: false, message: 'Error interno al consultar los cortes' },
            { status: 500 }
        )
    }
}
