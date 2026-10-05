import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

const TABLAS_PERMITIDAS = [
    'admin_costura_asignaciones',
    'admin_costura_ordenes',
    'admin_costura_cortes',
    'usuarios',
    'admin_costura_papelera',
    'productos_tiempos',
    'ordenes_produccion'
];

export async function GET() {
    try {
        const [columnas]: any = await pool.query(`
            SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND TABLE_NAME IN (?)
        `, [TABLAS_PERMITIDAS])

        const esquema: Record<string, any> = {}

        TABLAS_PERMITIDAS.forEach(tabla => {
            esquema[tabla] = { 
                dimensiones: [], 
                metricas: [{ id: 'id', label: 'Conteo Total (Frecuencia)' }] 
            }
        })

        for (const col of columnas) {
            const tabla = col.TABLE_NAME
            const nombreCol = col.COLUMN_NAME
            const tipo = col.DATA_TYPE.toLowerCase()

            if (nombreCol === 'id') continue; 

            // Mejorar la etiqueta visual
            let label = nombreCol.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            if (nombreCol === 'id_operador' || nombreCol === 'id_usuario') label = 'Operador (Nombre)'

            // Clasificación de variables
            if (['int', 'decimal', 'float', 'double', 'bigint', 'smallint', 'tinyint', 'numeric'].includes(tipo)) {
                // Si es un ID relacional (ej. id_operador), va a Categorías, NO a Matemáticas
                if (nombreCol.startsWith('id_')) {
                    esquema[tabla].dimensiones.push({ id: nombreCol, label })
                } else {
                    esquema[tabla].metricas.push({ id: nombreCol, label })
                }
            } else {
                esquema[tabla].dimensiones.push({ id: nombreCol, label })
            }
        }

        return NextResponse.json({ success: true, esquema })
    } catch (error) {
        console.error('Error al obtener esquema dinámico:', error)
        return NextResponse.json({ success: false, message: 'Error interno' }, { status: 500 })
    }
}