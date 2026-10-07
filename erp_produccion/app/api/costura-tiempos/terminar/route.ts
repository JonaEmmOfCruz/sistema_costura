import { NextResponse } from 'next/server'
import { pool } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { id_asignacion, op, tipo, tiempo_segundos, fecha_fin } = body 

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
            // 1. Marcar como TERMINADO en la tabla de asignaciones
            if (id_asignacion) {
                await pool.query(
                    `UPDATE admin_costura_asignaciones 
                     SET estatus = 'TERMINADO' 
                     WHERE id = ?`,
                    [id_asignacion]
                )
            }

            // 2. Guardar fecha de fin y los segundos en operador_tiempos_costura
            const fechaFinFinal = fecha_fin ? new Date(fecha_fin) : new Date();

            if (op) {
                await pool.query(
                    `UPDATE operador_tiempos_costura 
                     SET fecha_fin = ?, tiempo_segundos = ? 
                     WHERE op = ? AND fecha_fin IS NULL`,
                    [fechaFinFinal, tiempo_segundos || 0, op]
                )
            } else if (id_asignacion) {
                await pool.query(
                    `UPDATE operador_tiempos_costura 
                     SET fecha_fin = ?, tiempo_segundos = ? 
                     WHERE id = ?`,
                    [fechaFinFinal, tiempo_segundos || 0, id_asignacion]
                )
            }
        }

        return NextResponse.json({ success: true, message: 'Registro terminado con éxito' })
    } catch (error: any) {
        console.error("Error al terminar orden:", error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor', error: error.message }, { status: 500 })
    }
}