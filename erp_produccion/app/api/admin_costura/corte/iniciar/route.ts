import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

interface OrdenCosturaRow extends RowDataPacket {
    id: number
    rq: string | null
    op: string | null
    producto: string | null
    nombre: string | null
    cantidad: number | null
}

interface OrdenEnEsperaRow extends RowDataPacket {
    orden_id: number
}

interface CorteExistenteRow extends RowDataPacket {
    id: number
}

export const dynamic = 'force-dynamic';
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

            // 1. Obtener la información de la orden activa original
            const [rows] = await connection.query<OrdenCosturaRow[]>(
                'SELECT * FROM admin_costura_ordenes WHERE id = ? FOR UPDATE',
                [orden_id]
            )

            if (rows.length === 0) {
                await connection.release()
                return NextResponse.json({ success: false, message: 'La orden no existe' }, { status: 404 })
            }

            const orden = rows[0];

            const [ordenesEnEspera] = await connection.query<OrdenEnEsperaRow[]>(
                'SELECT orden_id FROM admin_costura_ordenes_espera WHERE orden_id = ? FOR UPDATE',
                [orden_id]
            )

            if (ordenesEnEspera.length > 0) {
                await connection.rollback()
                connection.release()
                return NextResponse.json(
                    { success: false, message: 'La OP está en espera y debe reanudarse antes de iniciar el corte' },
                    { status: 409 }
                )
            }

            // 2. Registrar o actualizar en la tabla de cortes con estatus 'corte en proceso' y fecha de inicio
            const [existingCorte] = await connection.query<CorteExistenteRow[]>(
                'SELECT id FROM admin_costura_cortes WHERE orden_id = ?',
                [orden_id]
            )

            if (existingCorte.length > 0) {
                await connection.query(
                    `UPDATE admin_costura_cortes 
                     SET estatus = 'corte en proceso', fecha_inicio = NOW() 
                     WHERE orden_id = ?`,
                    [orden_id]
                )
            } else {
                await connection.query(
                    `INSERT INTO admin_costura_cortes 
                    (orden_id, rq, op, producto, nombre, cantidad, estatus, fecha_inicio) 
                    VALUES (?, ?, ?, ?, ?, ?, 'corte en proceso', NOW())`,
                    [orden.id, orden.rq, orden.op, orden.producto, orden.nombre, orden.cantidad]
                )
            }

            // 3. Opcional: Actualizar el estado en la tabla de órdenes si manejas una columna de estado ahí
            await connection.query(
                `UPDATE admin_costura_ordenes SET estado = 'cortando' WHERE id = ?`,
                [orden_id]
            ).catch(() => {}) // Ignora si la columna estado no existe en admin_costura_ordenes

            await connection.commit()
            connection.release()

            return NextResponse.json({ success: true, message: 'Corte iniciado correctamente' })
        } catch (error) {
            await connection.rollback()
            connection.release()
            throw error
        }
    } catch (error) {
        console.error('Error al iniciar corte:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}