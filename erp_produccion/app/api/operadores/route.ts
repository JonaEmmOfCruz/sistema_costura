import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pageMetadata, pageRows, readPageParams } from "@/lib/pagination";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { page, pageSize, offset } = readPageParams(request)
        // Obtenemos los operadores y su vigencia actual si existe
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                u.id, 
                u.numero_empleado, 
                u.nombre, 
                u.area, 
                d.disponible_hasta,
                CASE 
                    WHEN d.disponible_hasta > NOW() THEN 1 
                    ELSE 0 
                END AS disponible
            FROM usuarios u
            LEFT JOIN operadores_disponibilidad d ON u.id = d.usuario_id
            WHERE u.tipo_usuario = 'operador'
            ORDER BY u.id ASC
            LIMIT ? OFFSET ?
        `, [pageSize + 1, offset])

        return NextResponse.json({
            success: true,
            usuarios: pageRows(rows, pageSize),
            pagination: pageMetadata(page, pageSize, rows.length)
        })
    } catch (error) {
        console.error('Error al obtener los operadores', error)
        return NextResponse.json(
            { success: false, message: 'Error interno al consultar los operadores' },
            { status: 500 }
        )
    }
}
