import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET() {
    try {
        const [rows]: any = await pool.query(
            `SELECT * FROM productos_tiempos ORDER BY id DESC`
        )

        return NextResponse.json({
            success: true,
            productos: rows
        })
    } catch (error) {
        console.error('Error al obtener los productos:', error)
        return NextResponse.json(
            { success: false, message: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}