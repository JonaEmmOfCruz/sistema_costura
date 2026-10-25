import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { RowDataPacket } from 'mysql2'
import { pageMetadata, pageRows, readPageParams } from '@/lib/pagination'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { page, pageSize, offset } = readPageParams(request)
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT
                id,
                id_proceso,
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
             ORDER BY cod_proceso ASC
             LIMIT ? OFFSET ?`,
            [pageSize + 1, offset]
        )

        return NextResponse.json({
            success: true,
            productos: pageRows(rows, pageSize),
            pagination: pageMetadata(page, pageSize, rows.length)
        })
    } catch (error) {
        console.error('Error al obtener los productos:', error)
        return NextResponse.json(
            { success: false, message: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
