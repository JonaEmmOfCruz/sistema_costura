import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM admin_costura_asignaciones ORDER BY id DESC'
        )

        return NextResponse.json({
            success: true,
            asignadas: rows
        })
    } catch (error) {
        console.error('Error al obtener los registros de corte', error)
        return NextResponse.json(
            { success: false, message: 'Error interno al consultar los cortes' },
            { status: 500 }
        )
    }
}