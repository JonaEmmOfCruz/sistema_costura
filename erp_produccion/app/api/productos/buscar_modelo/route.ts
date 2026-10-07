import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const modelo = searchParams.get('modelo')

        if (!modelo) {
            return NextResponse.json({ success: false, message: 'Modelo requerido' }, { status: 400 })
        }

        const [rows]: any = await pool.query(
            `SELECT nombre, costura, tiempo 
             FROM productos_tiempos 
             WHERE modelo = ? AND tiempo IS NOT NULL AND tiempo != '' 
             LIMIT 1`,
            [modelo]
        )

        if (rows.length > 0) {
            return NextResponse.json({ success: true, coincidencia: rows[0] })
        } else {
            return NextResponse.json({ success: false, message: 'Sin coincidencias' })
        }
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Error en la búsqueda de modelo' }, { status: 500 })
    }
}