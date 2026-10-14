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
    id: number
    op: string
}

interface OperatorAssignmentStatusRow extends RowDataPacket {
    op: string
    estatus: string | null
}

interface ActiveTimingSessionRow extends RowDataPacket {
    inicio_sesion_ms: number
    segundos_sesion_actual: number
    server_now_ms: number
}

const normalizarOp = (op: string) => op.trim().toUpperCase()

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
        const [asignacionesOperador] = await connection.query<OperatorAssignmentStatusRow[]>(
            `SELECT op, estatus FROM admin_costura_asignaciones
             WHERE id_operador = ?
             FOR UPDATE`,
            [asignacion.id_operador]
        )
        const opsActivas = new Set(
            asignacionesOperador
                .filter((item) => item.estatus === 'asignado' || item.estatus === null)
                .map((item) => normalizarOp(item.op))
        )
        const [sesiones] = await connection.query<OpenTimingSessionRow[]>(
            `SELECT id, op FROM operador_tiempos_costura
             WHERE id_operador = ? AND fecha_fin IS NULL
             FOR UPDATE`,
            [asignacion.id_operador]
        )
        const opAsignacion = normalizarOp(asignacion.op)
        const otraSesion = sesiones.find((sesion) =>
            normalizarOp(sesion.op) !== opAsignacion && opsActivas.has(normalizarOp(sesion.op))
        )

        if (otraSesion) {
            await connection.rollback()
            return NextResponse.json(
                { success: false, message: 'Ya existe un temporizador activo para otra OP de este operador' },
                { status: 409 }
            )
        }

        for (const sesion of sesiones) {
            if (!opsActivas.has(normalizarOp(sesion.op))) {
                await connection.query(
                    `UPDATE operador_tiempos_costura
                     SET fecha_fin = NOW(),
                         tiempo_segundos = COALESCE(tiempo_segundos, 0)
                             + TIMESTAMPDIFF(SECOND, fecha_inicio, NOW())
                     WHERE id = ? AND fecha_fin IS NULL`,
                    [sesion.id]
                )
            }
        }

        const sesionAsignacionActiva = sesiones.some(
            (sesion) => normalizarOp(sesion.op) === opAsignacion
        )

        if (!sesionAsignacionActiva) {
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

        const [sesionesActivas] = await connection.query<ActiveTimingSessionRow[]>(
            `SELECT
                CAST(UNIX_TIMESTAMP(fecha_inicio) * 1000 AS UNSIGNED) AS inicio_sesion_ms,
                GREATEST(
                    0,
                    TIMESTAMPDIFF(MICROSECOND, fecha_inicio, NOW(3)) / 1000000
                ) AS segundos_sesion_actual,
                CAST(UNIX_TIMESTAMP(NOW(3)) * 1000 AS UNSIGNED) AS server_now_ms
             FROM operador_tiempos_costura
             WHERE id_operador = ? AND op = ? AND fecha_fin IS NULL
             ORDER BY fecha_inicio DESC
             LIMIT 1`,
            [asignacion.id_operador, asignacion.op]
        )

        if (!sesionesActivas.length) {
            throw new Error('No se encontró la sesión de costura activa después de iniciarla')
        }

        await connection.commit()
        transactionStarted = false
        return NextResponse.json({
            success: true,
            message: 'Temporizador iniciado correctamente',
            ...sesionesActivas[0]
        })
    } catch (error) {
        if (connection && transactionStarted) await connection.rollback()
        console.error('Error al iniciar costura:', error)
        return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
    } finally {
        connection?.release()
    }
}
