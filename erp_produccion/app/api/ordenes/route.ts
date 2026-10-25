import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { pageMetadata, pageRows, readPageParams } from "@/lib/pagination";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { page, pageSize, offset } = readPageParams(request)
        const [rows] = await pool.query<RowDataPacket[]>(
            'select * from ordenes_produccion order by id ASC LIMIT ? OFFSET ?',
            [pageSize + 1, offset]
        )

        return NextResponse.json({
            success: true,
            ordenes: pageRows(rows, pageSize),
            pagination: pageMetadata(page, pageSize, rows.length)
        })
    } catch (error) {
        console.error('Error al obtener las ordenes de produccion', error)
        return NextResponse.json(
            {success: false, message: 'Error interno al consultar las ordenes'},
            {status: 500}
        )
    }
}
