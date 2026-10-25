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
    normalizarTexto(codigo).slice(0, 7)

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const codigo = searchParams.get('codigo') || ''
        const nombre = searchParams.get('nombre') || ''
        const modelo = searchParams.get('modelo') || ''
        const nombreBuscado = normalizarTexto(nombre)
        const codigoBuscado = normalizarTexto(codigo)
        const prefijoCodigoBuscado = extraerPrefijoCodigo(codigo)
        const familiaBuscada = normalizarTexto(modelo)

        if (!codigoBuscado && !nombreBuscado && !familiaBuscada) {
            return NextResponse.json({ success: false, message: 'Se requiere código, nombre o modelo del producto' }, { status: 400 })
        }

        const [productos] = await pool.query<ProductoTiempoRow[]>(`
            SELECT
                NULL AS id,
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
            ORDER BY
                CASE WHEN CHAR_LENGTH(TRIM(cod_proceso)) = 7 THEN 0 ELSE 1 END,
                id DESC
        `)

        const productoPorNombre = nombreBuscado
            ? productos.find(producto =>
                normalizarTexto(producto.nombre_secundario) === nombreBuscado ||
                normalizarTexto(producto.nombre) === nombreBuscado
            )
            : undefined

        if (productoPorNombre) {
            return NextResponse.json({
                success: true,
                coincidencia: productoPorNombre,
                criterio: 'nombre'
            })
        }

        const productoPorCodigo = codigoBuscado
            ? productos.find(producto => prefijoCodigoBuscado
                ? extraerPrefijoCodigo(producto.codigo) === prefijoCodigoBuscado
                : normalizarTexto(producto.codigo) === codigoBuscado)
            : undefined

        if (productoPorCodigo) {
            return NextResponse.json({
                success: true,
                coincidencia: productoPorCodigo,
                criterio: 'codigo'
            })
        }

        const productoPorFamilia = familiaBuscada
            ? productos.find(producto =>
                normalizarTexto(producto.modelo) === familiaBuscada ||
                normalizarTexto((producto.codigo || '').split('-')[1]) === familiaBuscada
            )
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
