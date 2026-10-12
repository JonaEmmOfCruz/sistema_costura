import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

interface OperatorAssignmentRow extends RowDataPacket {
    id_operador: number
    op: string
    rq: string
    producto: string
    nombre: string
    cantidad_asignada: number
    estatus: string | null
}

interface OpenTimingSessionRow extends RowDataPacket {
    op: string
}

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    let connection: Awaited<ReturnType<typeof pool.getConnection>> | null = null
    let transactionStarted = false

    try {
        const { asignacion_id } = await request.json()
        if (!asignacion_id) {
            return NextResponse.json({ success: false, message: 'ID de asignación requerido' }, { status: 400 })
        }

        connection = await pool.getConnection()
        await connection.beginTransaction()
        transactionStarted = true

        const [rows] = await connection.query<OperatorAssignmentRow[]>(
            `SELECT * FROM admin_costura_asignaciones WHERE id = ? FOR UPDATE`,
            [asignacion_id]
        )

        if (!rows.length || (rows[0].estatus !== 'asignado' && rows[0].estatus !== null)) {
            await connection.rollback()
            return NextResponse.json(
                { success: false, message: 'La asignación no está activa o está bloqueada por una orden prioritaria' },
                { status: 409 }
            )
        }

        const asignacion = rows[0]
        const [sesiones] = await connection.query<OpenTimingSessionRow[]>(
            `SELECT id, op FROM operador_tiempos_costura
             WHERE id_operador = ? AND fecha_fin IS NULL
             FOR UPDATE`,
            [asignacion.id_operador]
        )
        const otraSesion = sesiones.find((sesion) => sesion.op !== asignacion.op)

        if (otraSesion) {
            await connection.rollback()
            return NextResponse.json(
                { success: false, message: 'Ya existe un temporizador activo para otra OP de este operador' },
                { status: 409 }
            )
        }

        if (!sesiones.length) {
            await connection.query(
                `INSERT INTO operador_tiempos_costura
                    (rq, op, producto, nombre, cantidad_asignada, id_operador, fecha_inicio)
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
        }

        await connection.commit()
        transactionStarted = false
        return NextResponse.json({ success: true, message: 'Temporizador iniciado correctamente' })
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback()
        console.error('Error al iniciar costura:', error)
        return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
    } finally {
        connection?.release()
    }
}
