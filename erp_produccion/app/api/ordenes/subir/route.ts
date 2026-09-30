import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { success: false, message: 'No se ha proporcionado ningun archivo' },
                { status: 400 }
            )
        }

        const text = await file.text()
        const lines = text.split('\n').filter(line => line.trim() !== '')

        if (lines.length <= 1) {
            return NextResponse.json(
                { success: false, message: 'El archivo CSV esta vacio o no tiene registros' },
                { status: 400 }
            )
        }

        const rows = lines.slice(1)
        let insertedCount = 0

        for (const line of rows) {
            const values = line.split(';').map(val => val.trim().replace(/^"(.*)"$/, '$1'))

            if (values.length >= 11) {
                const [
                    rq, op, producto, nombre, observaciones,
                    cantidad, cliente, prioridad, orden, vigente_desde, fecha_de_entrega
                ] = values;

                await pool.query<ResultSetHeader>(
                    `INSERT INTO ordenes_produccion 
                    (rq, op, producto, nombre, observaciones, cantidad, cliente, prioridad, orden, vigente_desde, fecha_de_entrega) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        rq || null,
                        op || null,
                        producto || 'Sin producto',
                        nombre || 'Sin nombre',
                        observaciones || null,
                        parseInt(cantidad) || 0,
                        cliente || null,
                        prioridad || null,
                        orden || null,
                        vigente_desde || null,
                        fecha_de_entrega || null
                    ]
                );

                await pool.query<ResultSetHeader>(
                    `INSERT INTO admin_costura_ordenes 
                    (rq, op, producto, nombre, observaciones, cantidad, cliente, prioridad, orden, vigente_desde, fecha_de_entrega) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        rq || null,
                        op || null,
                        producto || 'Sin producto',
                        nombre || 'Sin nombre',
                        observaciones || null,
                        parseInt(cantidad) || 0,
                        cliente || null,
                        prioridad || null,
                        orden || null,
                        vigente_desde || null,
                        fecha_de_entrega || null
                    ]
                );

                insertedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Se han importado ${insertedCount} órdenes correctamente`
        })
    } catch (error) {
        console.error('Error al procesar CSV:', error)
        return NextResponse.json(
            { success: false, message: 'Error interno al procesar el archivo CSV' },
            { status: 500 }
        )
    }
}