import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT
                id,
                cod_proceso,
                descripcion,
                costura,
                t_costura,
                tapizado,
                t_tapizado,
                armado,
                t_armado,
                montado,
                t_montado,
                empaque,
                t_empaque,
                corte,
                t_corte
             FROM productos_tiempos
             ORDER BY cod_proceso ASC`
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