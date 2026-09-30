import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { asignacion_id } = body

        if (!asignacion_id) {
            return NextResponse.json({ success: false, message: 'ID de asignación requerido' }, { status: 400 })
        }

        // 1. Consultamos los datos de la asignación original en admin_costura_asignaciones
        const [asignaciones]: any = await pool.query(
            `SELECT * FROM admin_costura_asignaciones WHERE id = ?`,
            [asignacion_id]
        )

        if (asignaciones.length === 0) {
            return NextResponse.json({ success: false, message: 'Asignación no encontrada' }, { status: 404 })
        }

        const asignacion = asignaciones[0]

        // 2. Insertamos la información en operador_tiempos_costura junto con la fecha y hora exacta del clic
        await pool.query(
            `INSERT INTO operador_tiempos_costura (rq, op, producto, nombre, cantidad_asignada, id_operador, fecha_inicio) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
                asignacion.rq,
                asignacion.op,
                asignacion.producto,
                asignacion.nombre,
                asignacion.cantidad_asignada,
                asignacion.id_operador
            ]
        )

        return NextResponse.json({ 
            success: true, 
            message: 'Costura iniciada correctamente' 
        })

    } catch (error) {
        console.error('Error al iniciar costura:', error)
        return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
    }
}