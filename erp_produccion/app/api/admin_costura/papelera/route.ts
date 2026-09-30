import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { RowDataPacket } from "mysql2";

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { ids } = body // Espera un arreglo de IDs: { ids: [1, 2, 3] }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ success: false, message: 'No se proporcionaron IDs válidos' }, { status: 400 })
        }

        const connection = await pool.getConnection()

        try {
            await connection.beginTransaction()

            for (const id of ids) {
                // 1. Obtener toda la información de la orden antes de eliminarla
                const [rows]: any = await connection.query(
                    'SELECT * FROM admin_costura_ordenes WHERE id = ?',
                    [id]
                )

                if (rows.length === 0) {
                    continue; // Si no existe, pasamos a la siguiente
                }

                const orden = rows[0];

                // 2. Insertar toda la información en la tabla papelera
                await connection.query(
                    `INSERT INTO admin_costura_papelera 
                    (orden_original_id, rq, op, producto, nombre, observaciones, cantidad, cliente, prioridad, vigente_desde, fecha_de_entrega, motivo) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        orden.id,
                        orden.rq,
                        orden.op,
                        orden.producto,
                        orden.nombre,
                        orden.observaciones,
                        orden.cantidad,
                        orden.cliente,
                        orden.prioridad,
                        orden.vigente_desde,
                        orden.fecha_de_entrega,
                        'Eliminado por limpieza de área por el Administrador de Costura'
                    ]
                )

                // 3. Eliminar definitivamente el registro de la tabla activa de costura
                await connection.query(
                    'DELETE FROM admin_costura_ordenes WHERE id = ?',
                    [id]
                )
            }

            await connection.commit()
            connection.release()

            return NextResponse.json({ success: true, message: 'Órdenes enviadas a papelera y eliminadas correctamente' })
        } catch (error) {
            await connection.rollback()
            connection.release()
            throw error
        }
    } catch (error) {
        console.error('Error en papelera:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'select * from admin_costura_papelera order by id ASC'
        )

        return NextResponse.json({
            success: true,
            ordenes: rows
        })
    } catch (error) {
        console.error('Error al obtener las ordenes de produccion', error)
        return NextResponse.json(
            {success: false, message: 'Error interno al consultar las ordenes'},
            {status: 500}
        )
    }
}