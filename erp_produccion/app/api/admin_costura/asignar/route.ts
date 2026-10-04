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

            // 1. Obtener la orden y el tiempo que toma cada pieza (cruce con productos_tiempos)
            const [ordenRows]: any = await connection.query(
                `SELECT c.*, pt.tiempo AS tiempo_base
                 FROM admin_costura_cortes c
                 LEFT JOIN productos_tiempos pt ON c.producto = pt.codigo
                 WHERE (c.orden_id = ? OR c.id = ?) 
                 AND c.estatus IN ('cortada', 'asignacion parcial')`,
                [orden_id, orden_id]
            )

            if (ordenRows.length === 0) {
                await connection.release()
                return NextResponse.json({ success: false, message: 'Orden no encontrada, o ya fue totalmente asignada.' }, { status: 404 })
            }

            const orden = ordenRows[0]
            const cantidadTotalOriginal = Number(orden.cantidad) || 0
            const tiempoUnidad = Number(orden.tiempo_base) || 0
            const realOrdenId = orden.orden_id || orden.id

            // 2. Calcular cuántas piezas faltan por asignar (la "cola")
            const [asignaciones]: any = await connection.query(
                `SELECT SUM(cantidad_asignada) AS total_asignado 
                 FROM admin_costura_asignaciones 
                 WHERE orden_id = ?`,
                [realOrdenId]
            )
            const yaAsignado = Number(asignaciones[0].total_asignado) || 0
            const cantidadPendiente = cantidadTotalOriginal - yaAsignado

            if (cantidadPendiente <= 0) {
                await connection.release()
                return NextResponse.json({ success: false, message: 'Esta orden ya fue completamente asignada.' }, { status: 400 })
            }

            // 3. Validar operadores disponibles calculando sus minutos libres (Límite: 480 min)
            const [operadoresRows]: any = await connection.query(`
                SELECT 
                    u.id AS usuario_id, 
                    u.nombre,
                    COALESCE(SUM(a.cantidad_asignada * IFNULL(pt.tiempo, 0)), 0) AS minutos_ocupados
                FROM usuarios u
                JOIN operadores_disponibilidad d ON u.id = d.usuario_id
                LEFT JOIN admin_costura_asignaciones a 
                    ON a.id_operador = u.id AND a.estatus NOT IN ('completado', 'terminado', 'entregado')
                LEFT JOIN productos_tiempos pt 
                    ON a.producto = pt.codigo
                WHERE u.tipo_usuario = 'operador' 
                  AND d.disponible_hasta > NOW()
                GROUP BY u.id, u.nombre
                HAVING minutos_ocupados < 480
            `)

            let operadores = operadoresRows.map((op: any) => {
                const maxMinutos = 480;
                const minOcupados = Number(op.minutos_ocupados) || 0;
                const libres = maxMinutos - minOcupados;
                
                let capacidadPiezas = 0;
                if (tiempoUnidad > 480) {
                    // Regla especial: si la pieza toma más de 8 horas, se asigna solo 1 a cada operador libre
                    capacidadPiezas = 1;
                } else if (tiempoUnidad > 0) {
                    capacidadPiezas = Math.floor(libres / tiempoUnidad);
                } else {
                    capacidadPiezas = cantidadPendiente;
                }

                return {
                    ...op,
                    capacidadPiezas,
                    asignadas: 0
                }
            });

            // Filtrar los que tengan capacidad
            operadores = operadores.filter((op: any) => op.capacidadPiezas > 0);

            if (operadores.length === 0) {
                await connection.rollback()
                connection.release()
                return NextResponse.json({ 
                    success: false, 
                    message: 'No hay operadores libres o con tiempo suficiente en este momento para tomar la orden (superan las 8 horas).' 
                }, { status: 400 })
            }

            // 4. Reparto equitativo iterativo (round robin) para no pasarse de la capacidad de nadie
            let pendiente = cantidadPendiente;
            let asignadoEnEstaVuelta = 0;
            let huboAsignacion = true;

            while (pendiente > 0 && huboAsignacion) {
                huboAsignacion = false;
                
                for (let op of operadores) {
                    if (pendiente > 0 && op.asignadas < op.capacidadPiezas) {
                        op.asignadas += 1;
                        pendiente -= 1;
                        asignadoEnEstaVuelta += 1;
                        huboAsignacion = true;
                    }
                }
            }

            let operadoresAsignadosCount = 0;

            for (const op of operadores) {
                if (op.asignadas > 0) {
                    await connection.query(
                        `INSERT INTO admin_costura_asignaciones 
                        (orden_id, rq, op, producto, nombre, cantidad_asignada, id_operador, nombre_operador, estatus) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'asignado')`,
                        [
                            realOrdenId, 
                            orden.rq, 
                            orden.op, 
                            orden.producto, 
                            orden.nombre, 
                            op.asignadas, 
                            op.usuario_id, 
                            op.nombre
                        ]
                    )
                    operadoresAsignadosCount++;
                }
            }

            // 5. Actualizar estatus (asignado total o parcial)
            const iraACola = pendiente > 0;
            const estatusFinal = iraACola ? 'asignacion parcial' : 'asignado'
            
            await connection.query(
                `UPDATE admin_costura_cortes SET estatus = ? WHERE id = ?`,
                [estatusFinal, orden.id]
            )

            await connection.commit()
            connection.release()

            // 6. Generar mensaje de respuesta detallado
            let mensajeRespuesta = `Se asignaron ${asignadoEnEstaVuelta} piezas entre ${operadoresAsignadosCount} operadores.`
            if (iraACola) {
                mensajeRespuesta += ` Restan ${pendiente} piezas en cola esperando operadores libres o con tiempo disponible.`
            }

            return NextResponse.json({ 
                success: true, 
                message: mensajeRespuesta
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