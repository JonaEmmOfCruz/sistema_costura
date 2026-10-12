import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { ResultSetHeader, RowDataPacket } from 'mysql2'

export const dynamic = 'force-dynamic'

const MOTIVOS_ESPERA = ['No hay tela', 'Problema de calidad', 'Cambio de fecha'] as const
type MotivoEspera = typeof MOTIVOS_ESPERA[number]

interface OrdenRow extends RowDataPacket {
    id: number
}

interface CorteRow extends RowDataPacket {
    estatus: string
}

export async function POST(request: Request) {
    let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null
    let transactionStarted = false

    try {
        const body = await request.json()
        const ordenId = Number(body.orden_id)
        const accion = body.accion
        const motivo = body.motivo as MotivoEspera

        if (!Number.isInteger(ordenId) || ordenId <= 0) {
            return NextResponse.json({ success: false, message: 'ID de orden inválido' }, { status: 400 })
        }

        if (accion !== 'poner' && accion !== 'reanudar') {
            return NextResponse.json({ success: false, message: 'Acción inválida' }, { status: 400 })
        }

        if (accion === 'poner' && !MOTIVOS_ESPERA.includes(motivo)) {
            return NextResponse.json({ success: false, message: 'Selecciona un motivo válido para poner la OP en espera' }, { status: 400 })
        }

        connection = await pool.getConnection()
        await connection.beginTransaction()
        transactionStarted = true

        const [ordenes] = await connection.query<OrdenRow[]>(
            'SELECT id FROM admin_costura_ordenes WHERE id = ? FOR UPDATE',
            [ordenId]
        )

        if (!ordenes.length) {
            await connection.rollback()
            transactionStarted = false
            return NextResponse.json({ success: false, message: 'La orden no existe o ya fue retirada de costura' }, { status: 404 })
        }

        if (accion === 'poner') {
            const [cortes] = await connection.query<CorteRow[]>(
                'SELECT estatus FROM admin_costura_cortes WHERE orden_id = ? FOR UPDATE',
                [ordenId]
            )

            if (cortes.some(corte => corte.estatus === 'corte en proceso' || corte.estatus === 'cortada')) {
                await connection.rollback()
                transactionStarted = false
                return NextResponse.json({ success: false, message: 'No se puede poner en espera una OP que ya inició o terminó su corte' }, { status: 409 })
            }

            await connection.query(
                `INSERT INTO admin_costura_ordenes_espera (orden_id, motivo)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE motivo = VALUES(motivo), fecha_espera = CURRENT_TIMESTAMP`,
                [ordenId, motivo]
            )
        } else {
            const [result] = await connection.query<ResultSetHeader>(
                'DELETE FROM admin_costura_ordenes_espera WHERE orden_id = ?',
                [ordenId]
            )

            if (!result.affectedRows) {
                await connection.rollback()
                transactionStarted = false
                return NextResponse.json({ success: false, message: 'La OP ya no se encuentra en espera' }, { status: 409 })
            }
        }

        await connection.commit()
        transactionStarted = false

        return NextResponse.json({
            success: true,
            message: accion === 'poner'
                ? 'La OP quedó en espera'
                : 'La OP volvió a la sección de órdenes por cortar'
        })
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback()
        console.error('Error al actualizar la espera de una OP:', error)
        return NextResponse.json({ success: false, message: 'Error interno al actualizar la espera de la OP' }, { status: 500 })
    } finally {
        connection?.release()
    }
}
