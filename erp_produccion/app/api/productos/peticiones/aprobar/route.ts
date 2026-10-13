import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { peticion_id, nombre, codigo, nombre_secundario, costura, tiempo } = await request.json()

        // Insertar en productos_tiempos
        await pool.query(
            `INSERT INTO productos_tiempos
                (cod_proceso, descripcion, costura, t_costura, fecha_actualizacion)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
                descripcion = VALUES(descripcion),
                costura = VALUES(costura),
                t_costura = VALUES(t_costura),
                fecha_actualizacion = NOW()`,
            [codigo, nombre_secundario || nombre || '', costura || 'COSTURA', tiempo]
        )

        // Marcar petición como atendida
        if (peticion_id) {
            await pool.query(`UPDATE peticiones_tiempos SET estatus = 'atendido' WHERE id = ?`, [peticion_id])
        }

        return NextResponse.json({ success: true, message: 'Tiempo asignado correctamente' })
    } catch (error) {
        console.error('Error al registrar tiempo para petición de producto:', error)
        return NextResponse.json({ success: false, message: 'Error al confirmar asignación' }, { status: 500 })
    }
}