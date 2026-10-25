import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export const dynamic = 'force-dynamic';

const CAMPOS_PRODUCTO = [
    'id_proceso', 'cod_proceso', 'descripcion', 'costura', 't_costura', 'tapizado', 't_tapizado',
    'armado', 't_armado', 'montado', 't_montado', 'empaque', 't_empaque', 'corte', 't_corte'
] as const

const CAMPOS_TIEMPO = new Set(['t_costura', 't_tapizado', 't_armado', 't_montado', 't_empaque', 't_corte'])

function normalizarCodigoProceso(valor: unknown) {
    return String(valor ?? '').trim().replace(/^["']|["']$/g, '').trim()
}

function normalizarProducto(producto: Record<string, unknown>) {
    const values: Record<string, string | number | null> = {}
    for (const campo of CAMPOS_PRODUCTO) {
        const raw = producto[campo]
        if (campo === 'id_proceso') {
            if (raw === '' || raw === null || raw === undefined) {
                values[campo] = null
                continue
            }
            const numero = Number(raw)
            if (!Number.isInteger(numero) || numero < 0) throw new Error('El campo id_proceso debe ser un entero mayor o igual a cero.')
            values[campo] = numero
        } else if (CAMPOS_TIEMPO.has(campo)) {
            if (raw === '' || raw === null || raw === undefined) {
                values[campo] = null
                continue
            }
            const numero = Number(raw)
            if (!Number.isFinite(numero) || numero < 0) throw new Error(`El campo ${campo} debe ser un número mayor o igual a cero.`)
            values[campo] = numero
        } else {
            values[campo] = campo === 'cod_proceso'
                ? normalizarCodigoProceso(raw)
                : String(raw ?? '').trim()
        }
    }
    if (!values.cod_proceso) throw new Error('El código de proceso es obligatorio.')
    if (!values.descripcion) throw new Error('La descripción es obligatoria.')
    return values
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { accion } = body

        if (accion === 'agregar') {
            const producto = normalizarProducto(body.producto || {
                cod_proceso: body.codigo,
                descripcion: body.nombre_secundario || body.nombre || body.modelo,
                costura: body.costura,
                t_costura: body.tiempo,
            })
            const columnas = CAMPOS_PRODUCTO.join(', ')
            const placeholders = CAMPOS_PRODUCTO.map(() => '?').join(', ')
            const updates = CAMPOS_PRODUCTO.filter(campo => campo !== 'cod_proceso').map(campo => `${campo} = VALUES(${campo})`).join(', ')
            await pool.query(
                `INSERT INTO productos_tiempos (${columnas}) VALUES (${placeholders})
                 ON DUPLICATE KEY UPDATE ${updates}`,
                CAMPOS_PRODUCTO.map(campo => producto[campo])
            )
            return NextResponse.json({ success: true, message: 'Producto guardado correctamente.' })
        }

        return NextResponse.json({ success: false, message: 'Acción no válida' }, { status: 400 })
    } catch (error) {
        console.error('Error en POST crud:', error)
        const dbError = error as { code?: string }
        const message = dbError.code === 'ER_DUP_ENTRY'
            ? 'Ese código ya está asociado a otro producto.'
            : error instanceof Error && (error.message.startsWith('El campo') || error.message.includes('obligatorio'))
                ? error.message
                : 'No se pudo guardar el producto. Revisa los datos e inténtalo de nuevo.'
        const status = dbError.code === 'ER_DUP_ENTRY' ? 409 : message.startsWith('El campo') || message.includes('obligatorio') ? 400 : 500
        return NextResponse.json({ success: false, message }, { status })
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { accion, nombre, tiempo } = body

        if (accion === 'modificar_producto') {
            const id = Number(body.id)
            if (!Number.isInteger(id) || id <= 0) {
                return NextResponse.json({ success: false, message: 'ID de producto inválido.' }, { status: 400 })
            }
            const entrada = body.producto as Record<string, unknown> | undefined
            const campos = CAMPOS_PRODUCTO.filter(campo => entrada && Object.prototype.hasOwnProperty.call(entrada, campo))
            if (!entrada || !campos.length) {
                return NextResponse.json({ success: false, message: 'No hay cambios para guardar.' }, { status: 400 })
            }
            const producto: Record<string, string | number | null> = {}
            for (const campo of campos) {
                const raw = entrada[campo]
                if (campo === 'id_proceso') {
                    if (raw === '' || raw === null || raw === undefined) {
                        producto[campo] = null
                    } else {
                        const numero = Number(raw)
                        if (!Number.isInteger(numero) || numero < 0) {
                            return NextResponse.json({ success: false, message: 'El campo id_proceso debe ser un entero mayor o igual a cero.' }, { status: 400 })
                        }
                        producto[campo] = numero
                    }
                } else if (CAMPOS_TIEMPO.has(campo)) {
                    if (raw === '' || raw === null || raw === undefined) {
                        producto[campo] = null
                    } else {
                        const numero = Number(raw)
                        if (!Number.isFinite(numero) || numero < 0) {
                            return NextResponse.json({ success: false, message: `El campo ${campo} debe ser un número mayor o igual a cero.` }, { status: 400 })
                        }
                        producto[campo] = numero
                    }
                } else {
                    const valor = campo === 'cod_proceso'
                        ? normalizarCodigoProceso(raw)
                        : String(raw ?? '').trim()
                    if ((campo === 'cod_proceso' || campo === 'descripcion') && !valor) {
                        return NextResponse.json({ success: false, message: `El campo ${campo} es obligatorio.` }, { status: 400 })
                    }
                    producto[campo] = valor
                }
            }
            const connection = await pool.getConnection()
            try {
                await connection.beginTransaction()
                const [sourceRows]: any = await connection.query(
                    'SELECT * FROM productos_tiempos WHERE id = ? FOR UPDATE',
                    [id]
                )
                const source = sourceRows[0]
                if (!source) {
                    await connection.rollback()
                    return NextResponse.json({ success: false, message: 'Producto no encontrado.' }, { status: 404 })
                }

                let target: any = null
                if (Object.prototype.hasOwnProperty.call(producto, 'cod_proceso')) {
                    const [targetRows]: any = await connection.query(
                        'SELECT * FROM productos_tiempos WHERE cod_proceso = ? AND id <> ? LIMIT 1 FOR UPDATE',
                        [producto.cod_proceso, id]
                    )
                    target = targetRows[0] || null
                }

                if (target) {
                    // Al converger a un código ya existente, conserva los valores del destino;
                    // rellena sus campos vacíos con el origen y aplica lo que editó el usuario.
                    const fusionado: Record<string, unknown> = {}
                    for (const campo of CAMPOS_PRODUCTO) {
                        const valorDestino = target[campo]
                        const destinoVacio = valorDestino === null || valorDestino === undefined || String(valorDestino).trim() === ''
                        fusionado[campo] = Object.prototype.hasOwnProperty.call(producto, campo)
                            ? producto[campo]
                            : destinoVacio && source[campo] !== null && source[campo] !== undefined
                                ? source[campo]
                                : valorDestino
                    }
                    const updates = CAMPOS_PRODUCTO.map(campo => `${campo} = ?`).join(', ')
                    await connection.query(
                        `UPDATE productos_tiempos SET ${updates}, fecha_actualizacion = NOW() WHERE id = ?`,
                        [...CAMPOS_PRODUCTO.map(campo => fusionado[campo]), target.id]
                    )
                    await connection.query('DELETE FROM productos_tiempos WHERE id = ?', [id])
                    await connection.commit()
                    return NextResponse.json({
                        success: true,
                        merged: true,
                        targetId: target.id,
                        message: 'Cambios guardados y producto combinado con el registro existente.',
                    })
                }

                const updates = campos.map(campo => `${campo} = ?`).join(', ')
                await connection.query(
                    `UPDATE productos_tiempos SET ${updates}, fecha_actualizacion = NOW() WHERE id = ?`,
                    [...campos.map(campo => producto[campo]), id]
                )
                await connection.commit()
                return NextResponse.json({ success: true, message: 'Producto actualizado correctamente.' })
            } catch (error) {
                await connection.rollback()
                throw error
            } finally {
                connection.release()
            }
        }

        if (accion === 'modificar_por_nombre') {
            if (!nombre || !tiempo) {
                return NextResponse.json({ success: false, message: 'Faltan parámetros requeridos' }, { status: 400 })
            }

            const [result]: any = await pool.query(
                `UPDATE productos_tiempos SET t_costura = ? WHERE descripcion = ?`,
                [tiempo, nombre]
            )

            return NextResponse.json({ 
                success: true, 
                message: `Se actualizó el tiempo para ${result.affectedRows} registros con el nombre "${nombre}".` 
            })
        }

        return NextResponse.json({ success: false, message: 'Acción no válida' }, { status: 400 })
    } catch (error) {
        console.error('Error en PUT crud:', error)
        const dbError = error as { code?: string }
        const message = dbError.code === 'ER_DUP_ENTRY'
            ? 'Ese código ya está asociado a otro producto.'
            : error instanceof Error && (error.message.startsWith('El campo') || error.message.includes('obligatorio'))
                ? error.message
                : 'No se pudo guardar el cambio. Revisa los datos e inténtalo de nuevo.'
        const status = dbError.code === 'ER_DUP_ENTRY' ? 409 : message.startsWith('El campo') || message.includes('obligatorio') ? 400 : 500
        return NextResponse.json({ success: false, message }, { status })
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json()
        const { accion, id } = body

        if (accion === 'eliminar_individual') {
            if (!id) {
                return NextResponse.json({ success: false, message: 'ID no proporcionado' }, { status: 400 })
            }

            const [result]: any = await pool.query(
                `DELETE FROM productos_tiempos WHERE id = ?`,
                [id]
            )

            if (result.affectedRows === 0) {
                return NextResponse.json({ success: false, message: 'Registro no encontrado' }, { status: 404 })
            }

            return NextResponse.json({ success: true, message: 'Registro eliminado individualmente con éxito.' })
        }

        return NextResponse.json({ success: false, message: 'Acción no válida' }, { status: 400 })
    } catch (error) {
        console.error('Error en DELETE crud:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}
