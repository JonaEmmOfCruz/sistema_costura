import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic';

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
             SET fecha_fin = NOW(),
                 tiempo_segundos = COALESCE(tiempo_segundos, 0)
                     + TIMESTAMPDIFF(SECOND, fecha_inicio, NOW())
             WHERE fecha_fin IS NULL
               AND (
                   id_asignacion = ?
                   OR (id_asignacion IS NULL AND id_operador = ? AND op = ?)
               )`,
            [asignacion_id, asignacion.id_operador, asignacion.op]
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