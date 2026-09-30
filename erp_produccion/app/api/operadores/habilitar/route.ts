import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id } = body // ID del usuario (operador)

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID de operador no proporcionado' }, { status: 400 })
        }

        const connection = await pool.getConnection()

        try {
            await connection.beginTransaction()

            // 1. Verificamos si ya existe un registro previo para este operador
            const [rows]: any = await connection.query(
                'SELECT id FROM operadores_disponibilidad WHERE usuario_id = ?',
                [id]
            )

            if (rows.length > 0) {
                // Si ya existe, actualizamos la fecha sumando 20 horas desde ahora
                await connection.query(
                    `UPDATE operadores_disponibilidad 
                     SET disponible_hasta = DATE_ADD(NOW(), INTERVAL 20 HOUR) 
                     WHERE usuario_id = ?`,
                    [id]
                )
            } else {
                // Si no existe, insertamos el nuevo registro de disponibilidad
                await connection.query(
                    `INSERT INTO operadores_disponibilidad (usuario_id, disponible_hasta) 
                     VALUES (?, DATE_ADD(NOW(), INTERVAL 20 HOUR))`,
                    [id]
                )
            }

            await connection.commit()
            connection.release()

            return NextResponse.json({ success: true, message: 'Operador habilitado por 20 horas correctamente' })
        } catch (error) {
            await connection.rollback()
            connection.release()
            throw error
        }
    } catch (error) {
        console.error('Error al habilitar operador:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}