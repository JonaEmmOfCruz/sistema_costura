import { NextResponse } from 'next/server'
import {pool} from '@/lib/db'

export async function POST(request: Request) {
    try {
        const { orden_id } = await request.json()

        if (!orden_id) {
            return NextResponse.json({ success: false, message: 'Falta el ID de la orden' }, { status: 400 })
        }

        const connection = await pool.getConnection()

        try {
            await connection.beginTransaction()

            // 1. Cambiar estado de la orden a 'cortando'
            await connection.query(
                'UPDATE admin_costura_ordenes SET estado = "cortando" WHERE id = ?',
                [orden_id]
            )

            // 2. Registrar el inicio en la tabla de tiempos de corte
            await connection.query(
                'INSERT INTO admin_costura_tiempos_corte (orden_id, estado) VALUES (?, "en_proceso")',
                [orden_id]
            )

            await connection.commit()
            connection.release()

            return NextResponse.json({ success: true, message: 'Corte iniciado' })
        } catch (error) {
            await connection.rollback()
            connection.release()
            throw error
        }
    } catch (error) {
        console.error('Error al iniciar corte:', error)
        return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 })
    }
}