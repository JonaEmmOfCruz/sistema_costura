import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
    try {
        const { tabla, dimensionX, metricasY } = await request.json()

        const [columnasBD]: any = await pool.query(
            `SELECT COLUMN_NAME 
             FROM information_schema.columns 
             WHERE table_schema = DATABASE() AND table_name = ?`,
            [tabla]
        )

        if (columnasBD.length === 0) {
            return NextResponse.json({ success: false, message: `La tabla '${tabla}' no existe.` }, { status: 404 })
        }

        const columnasValidas = columnasBD.map((col: any) => col.COLUMN_NAME)

        if (!columnasValidas.includes(dimensionX)) {
            return NextResponse.json({ success: false, message: `El campo '${dimensionX}' no es válido.` }, { status: 400 })
        }

        if (!Array.isArray(metricasY) || metricasY.length === 0) {
            return NextResponse.json({ success: false, message: 'Se requiere al menos un valor.' }, { status: 400 })
        }

        for (const m of metricasY) {
            if (!columnasValidas.includes(m)) {
                return NextResponse.json({ success: false, message: `El campo '${m}' no existe.` }, { status: 400 })
            }
        }

        // Prefijamos con el nombre de la tabla para evitar choques con el JOIN
        const selectsY = metricasY.map(m => {
            if (m === 'id') {
                return `COUNT(${tabla}.${m}) AS ${m}`
            } else {
                return `SUM(CAST(COALESCE(${tabla}.${m}, 0) AS DECIMAL(10,2))) AS ${m}`
            }
        }).join(', ')
        
        let labelSelect = `COALESCE(CAST(${tabla}.${dimensionX} AS CHAR), 'Sin definir')`;
        let joinSQL = '';

        // INTERCEPTOR: Convierte IDs a Nombres Reales conectando con la tabla de usuarios
        if (dimensionX === 'id_operador' || dimensionX === 'id_usuario') {
            labelSelect = `COALESCE(u.nombre, 'Operador Desconocido')`;
            joinSQL = `LEFT JOIN usuarios u ON ${tabla}.${dimensionX} = u.id`;
        }

        const query = `
            SELECT 
                ${labelSelect} AS label, 
                ${selectsY}
            FROM ${tabla} 
            ${joinSQL}
            GROUP BY ${tabla}.${dimensionX}
            ORDER BY ${metricasY[0]} DESC
            LIMIT 50
        `

        const [rows] = await pool.query(query)
        
        return NextResponse.json({ success: true, data: rows })

    } catch (error) {
        console.error('Error generando reporte dinámico:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor.' }, { status: 500 })
    }
}