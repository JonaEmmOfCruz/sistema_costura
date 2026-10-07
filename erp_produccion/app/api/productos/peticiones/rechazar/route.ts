import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const { peticion_id } = await request.json()
        await pool.query(`UPDATE peticiones_tiempos SET estatus = 'rechazado' WHERE id = ?`, [peticion_id])
        return NextResponse.json({ success: true, message: 'Petición rechazada' })
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Error al rechazar petición' }, { status: 500 })
    }
}