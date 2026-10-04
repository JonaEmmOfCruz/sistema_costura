import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

// LISTA OFICIAL DE PREFIJOS
const PREFIJOS = [
    "103-070", "103-046", "202-070", "102-070", "102-020",
    "102-019", "102-160", "102-139", "102-137", "102-136",
    "202-136", "102-135", "102-132", "202-013", "102-110",
    "202-110", "202-137", "101-002"
];

// LÍMITE DE 8 HORAS EN SEGUNDOS
const MAX_SEGUNDOS = 480 * 60; // 28,800 segundos

export async function POST() {
    try {
        const connection = await pool.getConnection()

        try {
            await connection.beginTransaction()
            
            const likeCortes = PREFIJOS.map(p => `c.producto LIKE '${p}%' OR c.nombre LIKE '${p}%'`).join(' OR ');
            const likeAsign = PREFIJOS.map(p => `a.producto LIKE '${p}%' OR a.nombre LIKE '${p}%'`).join(' OR ');

            // 1. OBTENER OPERADORES ACTIVOS ORDENADOS POR QUIÉN FUE HABILITADO PRIMERO
            const [operadoresRows]: any = await connection.query(`
                SELECT u.id AS usuario_id, u.nombre 
                FROM usuarios u
                JOIN operadores_disponibilidad d ON u.id = d.usuario_id
                WHERE u.tipo_usuario = 'operador' AND d.disponible_hasta > NOW()
                ORDER BY d.disponible_hasta ASC
            `)

            if (operadoresRows.length === 0) {
                await connection.release()
                return NextResponse.json({ success: true, message: 'No hay operadores disponibles.' })
            }

            // Candado estricto: tieneAsignacionActiva asegura que solo hagan 1 cosa a la vez
            let operadores = operadoresRows.map((op: any) => ({ 
                ...op, 
                libres: MAX_SEGUNDOS, 
                tieneAsignacionActiva: false 
            }))

            // 2. LEER TAREAS ACTIVAS ACTUALES (Y PONERLES EL CANDADO)
            const [asignacionesActivas]: any = await connection.query(`
                SELECT a.*, pt.tiempo AS tiempo_base, 
                CASE WHEN (${likeAsign}) THEN 1 ELSE 4 END AS nivel_prioridad
                FROM admin_costura_asignaciones a
                LEFT JOIN productos_tiempos pt ON a.producto = pt.codigo
                WHERE a.estatus = 'asignado'
                FOR UPDATE
            `)

            for (const asig of asignacionesActivas) {
                const opIndex = operadores.findIndex((o: any) => o.usuario_id === asig.id_operador)
                if (opIndex !== -1) {
                    const tBase = Number(asig.tiempo_base) || 0
                    const costoUnidad = tBase > MAX_SEGUNDOS ? MAX_SEGUNDOS : tBase
                    const tiempoOcupado = Number(asig.cantidad_asignada) * costoUnidad
                    
                    operadores[opIndex].libres -= tiempoOcupado
                    // REGLA: Si ya tiene algo asignado, está OCUPADO
                    operadores[opIndex].tieneAsignacionActiva = true 
                }
            }

            // 3. REANUDAR TAREAS PAUSADAS ANTES DE DARLES ALGO NUEVO
            const [asignacionesPausadas]: any = await connection.query(`
                SELECT a.*, pt.tiempo AS tiempo_base,
                CASE WHEN (${likeAsign}) THEN 1 ELSE 4 END AS nivel_prioridad
                FROM admin_costura_asignaciones a
                LEFT JOIN productos_tiempos pt ON a.producto = pt.codigo
                WHERE a.estatus = 'pausado'
                ORDER BY nivel_prioridad ASC, a.id ASC
                FOR UPDATE
            `)

            for (const pausada of asignacionesPausadas) {
                const opIndex = operadores.findIndex((o: any) => o.usuario_id === pausada.id_operador)
                if (opIndex !== -1) {
                    const op = operadores[opIndex]
                    
                    // Si el operador ya está ocupado, no le reanudamos nada todavía
                    if (op.tieneAsignacionActiva) continue;

                    const tBase = Number(pausada.tiempo_base) || 0
                    const costoTiempoSeg = tBase > MAX_SEGUNDOS ? MAX_SEGUNDOS : tBase
                    const cantidadPausada = Number(pausada.cantidad_asignada)

                    if (costoTiempoSeg === 0 || op.libres >= costoTiempoSeg) {
                        const piezasReanudables = costoTiempoSeg === 0 ? cantidadPausada : Math.floor(op.libres / costoTiempoSeg)
                        
                        if (piezasReanudables >= cantidadPausada) {
                            // Reanuda completo
                            await connection.query(`UPDATE admin_costura_asignaciones SET estatus = 'asignado' WHERE id = ?`, [pausada.id])
                            op.libres -= (cantidadPausada * costoTiempoSeg)
                            op.tieneAsignacionActiva = true 
                            
                            pausada.estatus = 'asignado'
                            asignacionesActivas.push(pausada)
                        } else if (piezasReanudables > 0) {
                            // Reanuda parcial
                            await connection.query(`UPDATE admin_costura_asignaciones SET cantidad_asignada = ?, estatus = 'asignado' WHERE id = ?`, [piezasReanudables, pausada.id])
                            await connection.query(`
                                INSERT INTO admin_costura_asignaciones 
                                (orden_id, rq, op, producto, nombre, cantidad_asignada, id_operador, nombre_operador, estatus) 
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pausado')
                            `, [pausada.orden_id, pausada.rq, pausada.op, pausada.producto, pausada.nombre, (cantidadPausada - piezasReanudables), pausada.id_operador, pausada.nombre_operador])
                            
                            op.libres -= (piezasReanudables * costoTiempoSeg)
                            op.tieneAsignacionActiva = true 
                            
                            pausada.estatus = 'asignado'
                            pausada.cantidad_asignada = piezasReanudables
                            asignacionesActivas.push(pausada)
                        }
                    }
                }
            }

            // 4. OBTENER ÓRDENES NUEVAS PENDIENTES
            const [ordenesPendientes]: any = await connection.query(`
                SELECT c.*, pt.tiempo AS tiempo_base,
                CASE WHEN (${likeCortes}) THEN 1 ELSE 4 END AS nivel_prioridad
                FROM admin_costura_cortes c
                LEFT JOIN productos_tiempos pt ON c.producto = pt.codigo
                WHERE c.estatus IN ('cortada', 'asignacion parcial')
                ORDER BY nivel_prioridad ASC, c.id ASC
                FOR UPDATE
            `)

            // 5. ASIGNAR NUEVAS ÓRDENES (E INTERRUMPIR SI ES NECESARIO)
            for (const orden of ordenesPendientes) {
                const cantidadOriginal = Number(orden.cantidad) || 0
                const tiempoUnidadSeg = Number(orden.tiempo_base) || 0
                const costoTiempoSeg = tiempoUnidadSeg > MAX_SEGUNDOS ? MAX_SEGUNDOS : tiempoUnidadSeg
                
                const realOrdenId = orden.orden_id || orden.id
                const nivelUrgencia = orden.nivel_prioridad

                const [asignacionesBD]: any = await connection.query(
                    `SELECT SUM(cantidad_asignada) AS total_asignado FROM admin_costura_asignaciones WHERE orden_id = ?`, 
                    [realOrdenId]
                )
                let cantidadPendiente = cantidadOriginal - (Number(asignacionesBD[0].total_asignado) || 0)

                if (cantidadPendiente <= 0) {
                    await connection.query(`UPDATE admin_costura_cortes SET estatus = 'asignado' WHERE id = ?`, [orden.id])
                    continue
                }

                // SISTEMA DE INTERRUPCIÓN: Si la OP es PRIORITARIA (1), pausa a los que estén haciendo NORMAL (4)
                if (nivelUrgencia === 1 && costoTiempoSeg > 0) {
                    for (const asig of asignacionesActivas) {
                        if (asig.estatus === 'asignado' && asig.nivel_prioridad > nivelUrgencia && cantidadPendiente > 0) {
                            const opIndex = operadores.findIndex((o: any) => o.usuario_id === asig.id_operador)
                            
                            if (opIndex !== -1 && operadores[opIndex].tieneAsignacionActiva) {
                                // Pausamos su tarea actual
                                await connection.query(`UPDATE admin_costura_asignaciones SET estatus = 'pausado' WHERE id = ?`, [asig.id])
                                
                                const tBase = Number(asig.tiempo_base) || 0
                                const asigCosto = tBase > MAX_SEGUNDOS ? MAX_SEGUNDOS : tBase
                                const tiempoRecuperado = Number(asig.cantidad_asignada) * asigCosto
                                
                                // Le devolvemos su tiempo y LE QUITAMOS EL CANDADO para que tome la prioritaria
                                operadores[opIndex].libres += tiempoRecuperado
                                operadores[opIndex].tieneAsignacionActiva = false 
                                asig.estatus = 'pausado' 
                            }
                        }
                    }
                }

                // REPARTO EQUITATIVO (Solo a operadores SIN CANDADO, manteniendo el orden de habilitación)
                let operadoresValidos = operadores.filter((op: any) => 
                    !op.tieneAsignacionActiva && (costoTiempoSeg === 0 || op.libres >= costoTiempoSeg)
                )
                
                let asignacionesNuevas = new Map();

                while (cantidadPendiente > 0 && operadoresValidos.length > 0) {
                    let huboAsignacion = false
                    for (let op of operadoresValidos) {
                        if (cantidadPendiente > 0 && !op.tieneAsignacionActiva && (costoTiempoSeg === 0 || op.libres >= costoTiempoSeg)) {
                            op.libres -= costoTiempoSeg
                            cantidadPendiente -= 1
                            huboAsignacion = true
                            
                            asignacionesNuevas.set(op.usuario_id, (asignacionesNuevas.get(op.usuario_id) || 0) + 1)
                        }
                    }
                    if (!huboAsignacion) break;
                    
                    if (costoTiempoSeg > 0) {
                        operadoresValidos = operadoresValidos.filter((op: any) => op.libres >= costoTiempoSeg)
                    }
                }

                // INSERTAR NUEVAS TAREAS Y PONER CANDADO A LOS QUE LAS RECIBIERON
                for (let [opId, cant] of asignacionesNuevas.entries()) {
                    const opObj = operadores.find((o: any) => o.usuario_id === opId);
                    
                    opObj.tieneAsignacionActiva = true; 

                    const [result]: any = await connection.query(`
                        INSERT INTO admin_costura_asignaciones 
                        (orden_id, rq, op, producto, nombre, cantidad_asignada, id_operador, nombre_operador, estatus) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'asignado')
                    `, [realOrdenId, orden.rq, orden.op, orden.producto, orden.nombre, cant, opObj.usuario_id, opObj.nombre])
                    
                    asignacionesActivas.push({
                        id: result.insertId,
                        orden_id: realOrdenId,
                        id_operador: opObj.usuario_id,
                        cantidad_asignada: cant,
                        tiempo_base: orden.tiempo_base,
                        nivel_prioridad: nivelUrgencia,
                        estatus: 'asignado'
                    })
                }

                const estatusFinal = cantidadPendiente > 0 ? 'asignacion parcial' : 'asignado'
                await connection.query(`UPDATE admin_costura_cortes SET estatus = ? WHERE id = ?`, [estatusFinal, orden.id])
            }

            await connection.commit()
            connection.release()

            return NextResponse.json({ success: true, message: 'Auto-asignación completada correctamente.' })
        } catch (error) {
            await connection.rollback()
            connection.release()
            throw error
        }
    } catch (error) {
        console.error('Error auto-asignación:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}