import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(request: Request) {
    try {
        // 1. Extraemos las fechas junto con los campos requeridos
        const { tabla, dimensionX, metricasY, fechaInicio, fechaFin } = await request.json()

        // Consultamos tanto el nombre como el tipo de dato de las columnas
        const [columnasBD]: any = await pool.query(
            `SELECT COLUMN_NAME, DATA_TYPE 
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

        // 2. Detectamos automáticamente qué columna almacena las fechas (por tipo de dato o por nombre estándar)
        const columnaFechaObj = columnasBD.find((col: any) => 
            ['date', 'datetime', 'timestamp'].includes(col.DATA_TYPE?.toLowerCase()) ||
            ['fecha', 'created_at', 'fecha_creacion', 'fecha_registro'].includes(col.COLUMN_NAME.toLowerCase())
        )
        const columnaFecha = columnaFechaObj ? columnaFechaObj.COLUMN_NAME : null

        // 3. Construimos dinámicamente la cláusula WHERE y los parámetros parametrizados
        const condiciones: string[] = []
        const params: any[] = []

        if (columnaFecha && (fechaInicio || fechaFin)) {
            if (fechaInicio) {
                condiciones.push(`${tabla}.${columnaFecha} >= ?`)
                params.push(`${fechaInicio} 00:00:00`)
            }
            if (fechaFin) {
                condiciones.push(`${tabla}.${columnaFecha} <= ?`)
                params.push(`${fechaFin} 23:59:59`)
            }
        }

        const whereSQL = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : ''

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
            ${whereSQL}
            GROUP BY ${tabla}.${dimensionX}
            ORDER BY ${metricasY[0]} DESC
            LIMIT 50
        `

        // Pasamos 'params' a la ejecución del query para evitar inyección SQL
        const [rows] = await pool.query(query, params)
        
        return NextResponse.json({ success: true, data: rows })

    } catch (error) {
        console.error('Error generando reporte dinámico:', error)
        return NextResponse.json({ success: false, message: 'Error interno del servidor.' }, { status: 500 })
    }
}