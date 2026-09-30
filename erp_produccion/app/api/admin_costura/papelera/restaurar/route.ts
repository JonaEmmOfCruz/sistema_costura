import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { ResultSetHeader } from 'mysql2'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id } = body // ID del registro en la tabla papelera

        if (!id) {
            return NextResponse.json({ success: false, message: 'No se proporcionó un ID válido' }, { status: 400 })
        }

        const connection = await pool.getConnection()

        try {
            await connection.beginTransaction()

            // 1. Obtener la orden desde la papelera
            const [rows]: any = await connection.query(
                'SELECT * FROM admin_costura_papelera WHERE id = ?',
                [id]
            )

            if (rows.length === 0) {
                await connection.release()
                return NextResponse.json({ success: false, message: 'La orden no existe en la papelera' }, { status: 404 })
            }

            const papeleraItem = rows[0];

            // 2. Volver a insertarla en la tabla activa admin_costura_ordenes (sin 'estado' ni 'eliminado')
            await connection.query<ResultSetHeader>(
                `INSERT INTO admin_costura_ordenes 
                (rq, op, producto, nombre, observaciones, cantidad, cliente, prioridad, vigente_desde, fecha_de_entrega) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    papeleraItem.rq || null,
                    papeleraItem.op || null,
                    papeleraItem.producto || 'Sin producto',
                    papeleraItem.nombre || 'Sin nombre',
                    papeleraItem.observaciones || null,
                    papeleraItem.cantidad || 0,
                    papeleraItem.cliente || null,
                    papeleraItem.prioridad || null,
                    papeleraItem.vigente_desde || null,
                    papeleraItem.fecha_de_entrega || null
                ]
            );

            // 3. Eliminar el registro de la tabla papelera
            await connection.query(
                'DELETE FROM admin_costura_papelera WHERE id = ?',
                [id]
            )

            await connection.commit()
            connection.release()

            return NextResponse.json({ success: true, message: 'Orden restaurada exitosamente' })
        } catch (error) {
            await connection.rollback()
            connection.release()
            throw error
        }
    } catch (error) {
        console.error('Error al restaurar orden:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}