import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { RowDataPacket } from 'mysql2'

interface ProductoTiempoRow extends RowDataPacket {
    id: number
    modelo: string | null
    nombre: string | null
    codigo: string | null
    nombre_secundario: string | null
    costura: string | null
    t_costura: string | number | null
}

export const dynamic = 'force-dynamic'

const normalizarTexto = (valor: string | null | undefined) => (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('es-MX')

const extraerPrefijoCodigo = (codigo: string | null | undefined) =>
    normalizarTexto(codigo).replace(/^["']|["']$/g, '').trim().slice(0, 7)

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const codigo = searchParams.get('codigo') || ''
        const nombre = searchParams.get('nombre') || ''
        const modelo = searchParams.get('modelo') || ''
        const nombreBuscado = normalizarTexto(nombre)
        const codigoBuscado = normalizarTexto(codigo).replace(/^["']|["']$/g, '').trim()
        const prefijoCodigoBuscado = extraerPrefijoCodigo(codigoBuscado)
        const familiaModelo = normalizarTexto(modelo)
        const familiaBuscada = familiaModelo.includes('-') ? familiaModelo.split('-')[1] : familiaModelo

        if (!codigoBuscado && !nombreBuscado && !familiaBuscada) {
            return NextResponse.json({ success: false, message: 'Se requiere código, nombre o modelo del producto' }, { status: 400 })
        }

        const buscarProducto = async (condicion: string, parametros: unknown[]) => {
            const [rows] = await pool.query<ProductoTiempoRow[]>(`
                SELECT
                    id,
                    NULL AS modelo,
                    NULL AS nombre,
                    cod_proceso AS codigo,
                    descripcion AS nombre_secundario,
                    costura,
                    t_costura
                FROM productos_tiempos
                WHERE t_costura IS NOT NULL
                  AND t_costura > 0
                  AND costura IS NOT NULL
                  AND TRIM(CAST(costura AS CHAR)) <> ''
                  AND ${condicion}
                ORDER BY
                    CASE WHEN CHAR_LENGTH(TRIM(cod_proceso)) = 7 THEN 0 ELSE 1 END,
                    id DESC
                LIMIT 1
            `, parametros)
            return rows[0]
        }

        const productoPorCodigo = codigoBuscado
            ? await buscarProducto(
                `(cod_proceso LIKE CONCAT(?, '%')
                  OR cod_proceso LIKE CONCAT('"', ?, '%')
                  OR cod_proceso LIKE CONCAT(CHAR(39), ?, '%'))`,
                [prefijoCodigoBuscado || codigoBuscado, prefijoCodigoBuscado || codigoBuscado, prefijoCodigoBuscado || codigoBuscado]
            )
            : undefined

        if (productoPorCodigo) {
            return NextResponse.json({
                success: true,
                coincidencia: productoPorCodigo,
                criterio: 'codigo'
            })
        }

        const productoPorNombre = nombreBuscado
            ? await buscarProducto('UPPER(TRIM(descripcion)) = ?', [nombreBuscado])
            : undefined

        if (productoPorNombre) {
            return NextResponse.json({
                success: true,
                coincidencia: productoPorNombre,
                criterio: 'nombre'
            })
        }

        const productoPorFamilia = familiaBuscada
            ? await buscarProducto("SUBSTRING_INDEX(SUBSTRING_INDEX(cod_proceso, '-', 2), '-', -1) = ?", [familiaBuscada])
            : undefined

        if (productoPorFamilia) {
            return NextResponse.json({
                success: true,
                coincidencia: productoPorFamilia,
                criterio: 'familia'
            })
        }

        return NextResponse.json({
            success: false,
            message: 'No se encontraron productos con nombre coincidente ni registros de la misma familia'
        })
    } catch (error) {
        console.error('Error en la búsqueda inteligente de tiempos por producto:', error)
        return NextResponse.json({ success: false, message: 'Error en la búsqueda de información de producto' }, { status: 500 })
    }
}
