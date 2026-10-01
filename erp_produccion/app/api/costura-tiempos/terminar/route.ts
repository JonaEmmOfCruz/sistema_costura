import { NextResponse } from 'next/server'
import { pool } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { id_asignacion, op, id_operador, tipo } = body 

        if (!id_asignacion && !op) {
            return NextResponse.json({ success: false, message: 'Falta información de la asignación' }, { status: 400 })
        }

        if (tipo === 'corte') {
            await pool.query(
                `UPDATE admin_costura_cortes 
                 SET fecha_fin = NOW(), estatus = 'TERMINADO' 
                 WHERE id = ?`,
                [id_asignacion]
            )
        } else {
            // 1. Marcamos como TERMINADO en la tabla de asignaciones
            if (id_asignacion) {
                await pool.query(
                    `UPDATE admin_costura_asignaciones 
                     SET estatus = 'TERMINADO' 
                     WHERE id = ?`,
                    [id_asignacion]
                )
            }

            // 2. Cerramos el registro de tiempo pendiente en operador_tiempos_costura por OP o por ID activo
            if (op) {
                await pool.query(
                    `UPDATE operador_tiempos_costura 
                     SET fecha_fin = NOW() 
                     WHERE op = ? AND fecha_fin IS NULL`,
                    [op]
                )
            } else {
                await pool.query(
                    `UPDATE operador_tiempos_costura 
                     SET fecha_fin = NOW() 
                     WHERE id = ?`,
                    [id_asignacion]
                )
            }
        }

        return NextResponse.json({ success: true, message: 'Registro terminado con éxito' })
    } catch (error: any) {
        console.error("Error al terminar orden:", error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}