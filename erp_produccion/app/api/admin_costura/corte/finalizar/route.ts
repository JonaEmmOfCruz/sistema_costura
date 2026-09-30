import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { orden_id } = body

        if (!orden_id) {
            return NextResponse.json({ success: false, message: 'ID de orden no proporcionado' }, { status: 400 })
        }

        const connection = await pool.getConnection()

        try {
            await connection.beginTransaction()

            // 1. Actualizar el registro en la tabla de cortes a 'cortada' y registrar la fecha de fin
            await connection.query(
                `UPDATE admin_costura_cortes 
                 SET estatus = 'cortada', fecha_fin = NOW() 
                 WHERE orden_id = ?`,
                [orden_id]
            )

            // 2. Opcional: Actualizar el estado en la orden original
            await connection.query(
                `UPDATE admin_costura_ordenes SET estado = 'cortado' WHERE id = ?`,
                [orden_id]
            ).catch(() => {})

            await connection.commit()
            connection.release()

            return NextResponse.json({ success: true, message: 'Corte finalizado correctamente' })
        } catch (error) {
            await connection.rollback()
            connection.release()
            throw error
        }
    } catch (error) {
        console.error('Error al finalizar corte:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}