import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { accion, modelo, nombre, codigo, nombre_secundario, costura, tiempo } = body

        if (accion === 'agregar') {
            await pool.query(
                `INSERT INTO productos_tiempos (modelo, nombre, codigo, nombre_secundario, costura, tiempo) VALUES (?, ?, ?, ?, ?, ?)`,
                [modelo, nombre, codigo, nombre_secundario, costura, tiempo]
            )
            return NextResponse.json({ success: true, message: 'Producto agregado correctamente.' })
        }

        return NextResponse.json({ success: false, message: 'Acción no válida' }, { status: 400 })
    } catch (error) {
        console.error('Error en POST crud:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { accion, nombre, tiempo } = body

        if (accion === 'modificar_por_nombre') {
            if (!nombre || !tiempo) {
                return NextResponse.json({ success: false, message: 'Faltan parámetros requeridos' }, { status: 400 })
            }

            const [result]: any = await pool.query(
                `UPDATE productos_tiempos SET tiempo = ? WHERE nombre = ?`,
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
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
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