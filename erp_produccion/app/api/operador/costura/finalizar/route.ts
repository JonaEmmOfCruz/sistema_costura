import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { asignacion_id, tiempo_segundos } = body

        if (!asignacion_id) {
            return NextResponse.json({ success: false, message: 'ID de asignación requerido' }, { status: 400 })
        }

        // 1. Obtenemos los datos de la asignación para saber qué OP y qué operador están finalizando
        const [asignaciones]: any = await pool.query(
            `SELECT * FROM admin_costura_asignaciones WHERE id = ?`,
            [asignacion_id]
        )

        if (asignaciones.length === 0) {
            return NextResponse.json({ success: false, message: 'Asignación no encontrada' }, { status: 404 })
        }

        const asignacion = asignaciones[0]

        // 2. Actualizamos el registro en operador_tiempos_costura colocando la fecha_fin actual
        await pool.query(
            `UPDATE operador_tiempos_costura 
             SET fecha_fin = NOW() 
             WHERE id_operador = ? AND op = ? AND fecha_fin IS NULL`,
            [asignacion.id_operador, asignacion.op]
        )

        // 3. Eliminamos el registro de admin_costura_asignaciones para que ya no aparezca como asignación activa
        await pool.query(
            `DELETE FROM admin_costura_asignaciones WHERE id = ?`,
            [asignacion_id]
        )

        return NextResponse.json({ 
            success: true, 
            message: 'Costura finalizada y asignación eliminada correctamente' 
        })

    } catch (error) {
        console.error('Error al finalizar costura:', error)
        return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
    }
}