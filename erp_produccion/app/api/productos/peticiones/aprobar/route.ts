import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const { peticion_id, modelo, nombre, codigo, nombre_secundario, costura, tiempo } = await request.json()

        // Insertar en productos_tiempos
        await pool.query(
            `INSERT INTO productos_tiempos (modelo, nombre, codigo, nombre_secundario, costura, tiempo, fecha_actualizacion)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [modelo, nombre || '', codigo, nombre_secundario, costura || '1', tiempo]
        )

        // Marcar petición como atendida
        if (peticion_id) {
            await pool.query(`UPDATE peticiones_tiempos SET estatus = 'atendido' WHERE id = ?`, [peticion_id])
        }

        return NextResponse.json({ success: true, message: 'Tiempo asignado correctamente' })
    } catch (error) {
        return NextResponse.json({ success: false, message: 'Error al confirmar asignación' }, { status: 500 })
    }
}