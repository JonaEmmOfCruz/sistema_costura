import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'select * from ordenes_produccion order by id ASC'
        )

        return NextResponse.json({
            success: true,
            ordenes: rows
        })
    } catch (error) {
        console.error('Error al obtener las ordenes de produccion', error)
        return NextResponse.json(
            {success: false, message: 'Error interno al consultar las ordenes'},
            {status: 500}
        )
    }
}