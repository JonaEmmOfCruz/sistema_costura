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

            // 1. Obtener la orden asegurándonos que tenga estatus 'cortada'
            const [ordenRows]: any = await connection.query(
                `SELECT * FROM admin_costura_cortes 
                 WHERE (orden_id = ? OR id = ?) AND estatus = 'cortada'`,
                [orden_id, orden_id]
            )

            if (ordenRows.length === 0) {
                await connection.release()
                return NextResponse.json({ success: false, message: 'Orden no encontrada o aún no ha sido cortada' }, { status: 404 })
            }

            const orden = ordenRows[0]
            const cantidadTotal = Number(orden.cantidad) || 0
            const realOrdenId = orden.orden_id || orden.id

            // 2. Obtener operadores disponibles que NO tengan ninguna OP asignada en admin_costura_asignaciones
            const [operadoresRows]: any = await connection.query(`
                SELECT u.id AS usuario_id, u.nombre 
                FROM usuarios u
                JOIN operadores_disponibilidad d ON u.id = d.usuario_id
                WHERE u.tipo_usuario = 'operador' 
                  AND d.disponible_hasta > NOW()
                  AND NOT EXISTS (
                      SELECT 1 FROM admin_costura_asignaciones a 
                      WHERE a.id_operador = u.id
                  )
            `)

            if (operadoresRows.length === 0) {
                await connection.rollback()
                connection.release()
                return NextResponse.json({ 
                    success: false, 
                    message: 'No hay operadores disponibles o todos los operadores ya tienen una OP asignada en este momento.' 
                }, { status: 400 })
            }

            const totalOperadores = operadoresRows.length
            const cantidadBase = Math.floor(cantidadTotal / totalOperadores)
            let sobrante = cantidadTotal % totalOperadores

            // 3. Insertar la porción correspondiente para cada operador libre
            for (let i = 0; i < totalOperadores; i++) {
                const opRow = operadoresRows[i]
                const asignada = cantidadBase + (i === 0 ? sobrante : 0)

                await connection.query(
                    `INSERT INTO admin_costura_asignaciones 
                    (orden_id, rq, op, producto, nombre, cantidad_asignada, id_operador, nombre_operador) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        realOrdenId, 
                        orden.rq, 
                        orden.op, 
                        orden.producto, 
                        orden.nombre, 
                        asignada, 
                        opRow.usuario_id, 
                        opRow.nombre
                    ]
                )
            }

            await connection.commit()
            connection.release()

            return NextResponse.json({ 
                success: true, 
                message: `Asignación equitativa completada entre ${totalOperadores} operadores libres.` 
            })
        } catch (error) {
            await connection.rollback()
            connection.release()
            throw error
        }
    } catch (error) {
        console.error('Error al asignar orden equitativamente:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}