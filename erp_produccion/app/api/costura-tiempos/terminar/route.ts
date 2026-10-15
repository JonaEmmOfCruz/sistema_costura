import { NextResponse } from 'next/server'
import { pool } from "@/lib/db";
import { RowDataPacket } from 'mysql2'

interface AssignmentTimingRow extends RowDataPacket {
    id_operador: number
    op: string
    estatus: string
}

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { id_asignacion, op, tipo, fecha_fin } = body

        if (!id_asignacion && !op) {
            return NextResponse.json({ success: false, message: 'Falta información de la asignación' }, { status: 400 })
        }

        if (tipo === 'corte') {
            await pool.query(
                `UPDATE admin_costura_cortes 
                 SET fecha_fin = COALESCE(?, NOW()), estatus = 'TERMINADO' 
                 WHERE id = ?`,
                [fecha_fin || null, id_asignacion]
            )
        } else {
            const connection = await pool.getConnection()

            try {
                await connection.beginTransaction()

                if (id_asignacion) {
                    const [rows] = await connection.query<AssignmentTimingRow[]>(
                        `SELECT id_operador, op, estatus FROM admin_costura_asignaciones WHERE id = ? FOR UPDATE`,
                        [id_asignacion]
                    )

                    if (!rows.length) {
                        await connection.rollback()
                        return NextResponse.json(
                            { success: false, message: 'Asignación no encontrada' },
                            { status: 404 }
                        )
                    }

                    const asignacion = rows[0]
                    if (asignacion.estatus === 'pausado') {
                        await connection.rollback()
                        return NextResponse.json(
                            { success: false, message: 'No puedes terminar una orden bloqueada por una prioridad' },
                            { status: 409 }
                        )
                    }

                    await connection.query(
                        `UPDATE operador_tiempos_costura
                        SET fecha_fin = NOW(),
                            tiempo_segundos = COALESCE(tiempo_segundos, 0)
                                + TIMESTAMPDIFF(SECOND, fecha_inicio, NOW())
                         WHERE fecha_fin IS NULL
                           AND (
                               id_asignacion = ?
                               OR (id_asignacion IS NULL AND id_operador = ? AND op = ?)
                           )`,
                        [id_asignacion, asignacion.id_operador, asignacion.op]
                    )

                    await connection.query(
                        `UPDATE admin_costura_asignaciones SET estatus = 'TERMINADO' WHERE id = ?`,
                        [id_asignacion]
                    )
                } else if (op) {
                    await connection.query(
                        `UPDATE operador_tiempos_costura
                        SET fecha_fin = NOW(),
                            tiempo_segundos = COALESCE(tiempo_segundos, 0)
                                + TIMESTAMPDIFF(SECOND, fecha_inicio, NOW())
                         WHERE op = ? AND fecha_fin IS NULL`,
                        [op]
                    )
                }

                await connection.commit()
            } catch (error) {
                await connection.rollback()
                throw error
            } finally {
                connection.release()
            }
        }

        return NextResponse.json({ success: true, message: 'Registro terminado con éxito' })
    } catch (error) {
        console.error("Error al terminar orden:", error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}