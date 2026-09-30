import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id_operador = searchParams.get('id_operador')

        if (!id_operador) {
            return NextResponse.json({ success: false, message: 'ID de operador requerido' }, { status: 400 })
        }

        // Buscamos la asignación y cruzamos con manuales_produccion donde el producto comience con el nombre del archivo
        const [rows]: any = await pool.query(`
            SELECT a.*, m.ruta as manual_ruta, m.tipo as manual_tipo, m.nombre_original as manual_nombre
            FROM admin_costura_asignaciones a
            LEFT JOIN manuales_produccion m ON a.producto LIKE CONCAT(SUBSTRING_INDEX(m.nombre_original, '.', 1), '%')
            WHERE a.id_operador = ? 
            ORDER BY a.id ASC
            LIMIT 1
        `, [id_operador])

        return NextResponse.json({ 
            success: true, 
            asignaciones: rows 
        })
    } catch (error) {
        console.error('Error al obtener asignaciones del operador:', error)
        return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
    }
}