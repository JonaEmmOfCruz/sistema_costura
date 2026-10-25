import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pageMetadata, pageRows, readPageParams } from "@/lib/pagination";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { page, pageSize, offset } = readPageParams(request)
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                c.id,
                c.orden_id,
                c.rq,
                c.op,
                c.producto,
                c.nombre,
                c.cantidad,
                c.fecha_inicio,
                c.fecha_fin,
                c.creado_en,
                o.vigente_desde,
                o.fecha_de_entrega
            FROM admin_costura_cortes c
            LEFT JOIN ordenes_produccion o ON c.op = o.op
            ORDER BY c.id DESC
            LIMIT ? OFFSET ?
        `, [pageSize + 1, offset]);

        return NextResponse.json({
            success: true,
            cortes: pageRows(rows, pageSize),
            pagination: pageMetadata(page, pageSize, rows.length)
        });
    } catch (error) {
        console.error('Error al obtener los cortes de costura', error);
        return NextResponse.json(
            { success: false, message: 'Error interno al consultar los cortes' },
            { status: 500 }
        );
    }
}
