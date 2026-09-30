import { NextResponse } from 'next/server'
import {pool} from '@/lib/db'

export async function POST(request: Request) {
    try {
        const { orden_id, segundos } = await request.json()

        if (!orden_id || segundos === undefined) {
            return NextResponse.json({ success: false, message: 'Datos incompletos' }, { status: 400 })
        }

        const connection = await pool.getConnection()

        try {
            await connection.beginTransaction()

            // 1. Actualizar estado de la orden a 'cortado'
            await connection.query(
                'UPDATE admin_costura_ordenes SET estado = "cortado" WHERE id = ?',
                [orden_id]
            )

            // 2. Actualizar el registro de tiempos de corte con el fin y el total en segundos
            await connection.query(
                `UPDATE admin_costura_tiempos_corte 
                 SET fin_corte = CURRENT_TIMESTAMP, tiempo_total_segundos = ?, estado = "completado" 
                 WHERE orden_id = ? AND estado = "en_proceso"`,
                [segundos, orden_id]
            )

            await connection.commit()
            connection.release()

            return NextResponse.json({ success: true, message: 'Corte finalizado y contabilizado' })
        } catch (error) {
            await connection.rollback()
            connection.release()
            throw error
        }
    } catch (error) {
        console.error('Error al finalizar corte:', error)
        return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 })
    }
}