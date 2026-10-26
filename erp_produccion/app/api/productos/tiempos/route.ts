import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { RowDataPacket } from 'mysql2'
import { pageMetadata, pageRows, readPageParams } from '@/lib/pagination'

export const dynamic = 'force-dynamic';

const columnasFiltrables = new Set([
    'cod_proceso',
    'modelo',
    'nombre',
    'descripcion',
    'linea',
    'costura',
    't_costura',
    'tiempo_total_costura',
    'tapizado',
    't_tapizado',
    'armado',
    't_armado',
    'montado',
    't_montado',
    'empaque',
    't_empaque',
    'corte',
    't_corte'
])

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const filterField = searchParams.get('filterField')

        if (filterField) {
            if (!columnasFiltrables.has(filterField)) {
                return NextResponse.json(
                    { success: false, message: 'La columna solicitada no se puede filtrar.' },
                    { status: 400 }
                )
            }

            const [rows] = await pool.query<RowDataPacket[]>(
                `SELECT DISTINCT COALESCE(CAST(\`${filterField}\` AS CHAR) COLLATE utf8mb4_bin, '-') AS value
                 FROM productos_tiempos
                 ORDER BY value ASC`
            )

            return NextResponse.json({
                success: true,
                values: rows.map(row => String(row.value))
            })
        }

        const filters: Record<string, string[]> = {}
        const filtersParam = searchParams.get('filters')
        if (filtersParam) {
            let parsedFilters: unknown
            try {
                parsedFilters = JSON.parse(filtersParam)
            } catch {
                return NextResponse.json(
                    { success: false, message: 'Los filtros enviados no son válidos.' },
                    { status: 400 }
                )
            }

            if (!parsedFilters || typeof parsedFilters !== 'object' || Array.isArray(parsedFilters)) {
                return NextResponse.json(
                    { success: false, message: 'Los filtros enviados no son válidos.' },
                    { status: 400 }
                )
            }

            for (const [field, values] of Object.entries(parsedFilters)) {
                if (
                    !columnasFiltrables.has(field) ||
                    !Array.isArray(values) ||
                    !values.every((value): value is string => typeof value === 'string')
                ) {
                    return NextResponse.json(
                        { success: false, message: 'Los filtros enviados no son válidos.' },
                        { status: 400 }
                    )
                }
                filters[field] = values
            }
        }

        const conditions: string[] = []
        const params: (string | number)[] = []
        for (const [field, values] of Object.entries(filters)) {
            if (!values.length) continue
            conditions.push(
                `COALESCE(CAST(\`${field}\` AS CHAR) COLLATE utf8mb4_bin, '-') IN (${values.map(() => '?').join(', ')})`
            )
            params.push(...values)
        }

        const search = (searchParams.get('search') || '')
            .trim()
            .replace(/^['"]|['"]$/g, '')
            .trim()
        if (search) {
            conditions.push(`REPLACE(REPLACE(TRIM(cod_proceso), '"', ''), CHAR(39), '') LIKE ?`)
            params.push(`%${search}%`)
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
        const { page, pageSize, offset } = readPageParams(request)
        params.push(pageSize + 1, offset)
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT
                id,
                id_proceso,
                cod_proceso,
                modelo,
                nombre,
                descripcion,
                linea,
                costura,
                t_costura,
                tiempo_total_costura,
                tapizado,
                t_tapizado,
                armado,
                t_armado,
                montado,
                t_montado,
                empaque,
                t_empaque,
                corte,
                t_corte
             FROM productos_tiempos
             ${whereClause}
             ORDER BY cod_proceso ASC
             LIMIT ? OFFSET ?`,
            params
        )

        return NextResponse.json({
            success: true,
            productos: pageRows(rows, pageSize),
            pagination: pageMetadata(page, pageSize, rows.length)
        })
    } catch (error) {
        console.error('Error al obtener los productos:', error)
        return NextResponse.json(
            { success: false, message: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
