import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET() {
    try {
        const [manuales]: any = await pool.query(
            `SELECT * FROM manuales_produccion ORDER BY id DESC`
        )

        return NextResponse.json({ 
            success: true, 
            manuales 
        })
    } catch (error) {
        console.error('Error al obtener los manuales:', error)
        return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
    }
}