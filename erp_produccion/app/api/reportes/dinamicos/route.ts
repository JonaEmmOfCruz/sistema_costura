import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

// DICCIONARIO DE SEGURIDAD ACTUALIZADO
const SCHEMAS: Record<string, { dimensions: string[], metrics: string[] }> = {
    usuarios: { dimensions: ['area', 'tipo_usuario'], metrics: ['id'] },
    admin_costura_ordenes: { dimensions: ['cliente', 'prioridad', 'producto'], metrics: ['cantidad', 'id'] },
    admin_costura_asignaciones: { dimensions: ['nombre_operador', 'producto', 'estatus'], metrics: ['cantidad_asignada', 'id'] },
    admin_costura_cortes: { dimensions: ['estatus', 'producto'], metrics: ['cantidad', 'id'] },
    operador_tiempos_costura: { dimensions: ['id_operador', 'producto'], metrics: ['cantidad_asignada', 'id'] },
    ordenes_produccion: { dimensions: ['cliente', 'prioridad', 'producto'], metrics: ['cantidad', 'id'] },
    productos_tiempos: { dimensions: ['modelo', 'costura'], metrics: ['id'] },
    admin_costura_papelera: { dimensions: ['motivo', 'producto', 'cliente'], metrics: ['cantidad', 'id'] }
}

export async function POST(request: Request) {
    try {
        const { tabla, dimensionX, metricaY } = await request.json()

        if (!SCHEMAS[tabla]) {
            return NextResponse.json({ success: false, message: 'Tabla no permitida' }, { status: 400 })
        }
        if (!SCHEMAS[tabla].dimensions.includes(dimensionX) || !SCHEMAS[tabla].metrics.includes(metricaY)) {
            return NextResponse.json({ success: false, message: 'Columnas no permitidas' }, { status: 400 })
        }

        const isCount = metricaY === 'id'
        const selectY = isCount ? `COUNT(${metricaY})` : `SUM(${metricaY})`
        
        const query = `
            SELECT 
                COALESCE(${dimensionX}, 'Sin definir') AS label, 
                ${selectY} AS value 
            FROM ${tabla} 
            GROUP BY ${dimensionX}
            ORDER BY value DESC
            LIMIT 20
        `

        const [rows] = await pool.query(query)
        return NextResponse.json({ success: true, data: rows })

    } catch (error) {
        console.error('Error generando reporte:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 })
    }
}