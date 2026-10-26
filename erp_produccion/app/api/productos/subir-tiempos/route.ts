import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

interface ProductoTiempoImportado {
    id_proceso: number | null
    cod_proceso: string
    modelo: string | null
    nombre: string | null
    descripcion: string | null
    linea: string | null
    costura: string | null
    t_costura: number | null
    tiempo_total_costura: number | null
    tapizado: string | null
    t_tapizado: number | null
    armado: string | null
    t_armado: number | null
    montado: string | null
    t_montado: number | null
    empaque: string | null
    t_empaque: number | null
    corte: string | null
    t_corte: number | null
}

const columnasProducto = [
    'id_proceso',
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
] as const

const columnasRequeridas = columnasProducto.filter(columna =>
    columna !== 'id_proceso' && columna !== 'modelo' && columna !== 'nombre' && columna !== 'linea' && columna !== 'tiempo_total_costura'
)

const normalizarEncabezado = (valor: unknown) =>
    String(valor ?? '').trim().toLocaleLowerCase('es-MX')

const textoCelda = (valor: unknown) => {
    const texto = String(valor ?? '').trim()
    return texto || null
}

const numeroCelda = (valor: unknown) => {
    if (valor === null || valor === undefined || String(valor).trim() === '') return null
    const numero = Number(valor)
    return Number.isFinite(numero) ? numero : null
}

async function guardarProductos(productos: ProductoTiempoImportado[]) {
    const connection = await pool.getConnection()

    try {
        await connection.beginTransaction()

        const tamanoLote = 200
        for (let inicio = 0; inicio < productos.length; inicio += tamanoLote) {
            const lote = productos.slice(inicio, inicio + tamanoLote)
            const valores = lote.flatMap(producto => columnasProducto.map(columna => producto[columna]))
            const filasSql = lote.map(() => `(${columnasProducto.map(() => '?').join(', ')})`).join(', ')

            await connection.query(
                `INSERT INTO productos_tiempos (${columnasProducto.join(', ')})
                 VALUES ${filasSql}
                 ON DUPLICATE KEY UPDATE
                    id_proceso = VALUES(id_proceso),
                    modelo = VALUES(modelo),
                    nombre = VALUES(nombre),
                    descripcion = VALUES(descripcion),
                    linea = VALUES(linea),
                    costura = VALUES(costura),
                    t_costura = VALUES(t_costura),
                    tiempo_total_costura = VALUES(tiempo_total_costura),
                    tapizado = VALUES(tapizado),
                    t_tapizado = VALUES(t_tapizado),
                    armado = VALUES(armado),
                    t_armado = VALUES(t_armado),
                    montado = VALUES(montado),
                    t_montado = VALUES(t_montado),
                    empaque = VALUES(empaque),
                    t_empaque = VALUES(t_empaque),
                    corte = VALUES(corte),
                    t_corte = VALUES(t_corte)`,
                valores
            )
        }

        await connection.commit()
    } catch (error) {
        await connection.rollback()
        throw error
    } finally {
        connection.release()
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file')

        if (!(file instanceof File) || file.size === 0) {
            return NextResponse.json(
                { success: false, message: 'Selecciona un archivo Excel válido.' },
                { status: 400 }
            )
        }

        if (!/\.(xlsx|xls|xltx|csv)$/i.test(file.name)) {
            return NextResponse.json(
                { success: false, message: 'El formato debe ser .xltx, .xlsx, .xls o .csv.' },
                { status: 400 }
            )
        }

        const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const sheet = sheetName ? workbook.Sheets[sheetName] : undefined

        if (!sheet) {
            return NextResponse.json(
                { success: false, message: 'El archivo no contiene una hoja con datos.' },
                { status: 400 }
            )
        }

        const filas = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            defval: null,
            raw: true
        })
        const encabezados = (filas[0] || []).map(normalizarEncabezado)
        const indices = new Map(encabezados.map((encabezado, posicion) => [encabezado, posicion]))
        if (!indices.has('cod_proceso') && indices.has('codigo')) indices.set('cod_proceso', indices.get('codigo')!)
        if (!indices.has('descripcion') && indices.has('nombre')) indices.set('descripcion', indices.get('nombre')!)
        const esFormatoProductos = columnasRequeridas.every(columna => indices.has(columna))
        const productosPorCodigo = new Map<string, ProductoTiempoImportado>()
        let filasOmitidas = 0
        let codigosConsolidados = 0

        if (esFormatoProductos) {
            for (const fila of filas.slice(1)) {
                const codigo = textoCelda(fila[indices.get('cod_proceso')!])
                if (!codigo) {
                    filasOmitidas++
                    continue
                }

                const producto: ProductoTiempoImportado = {
                    id_proceso: indices.has('id_proceso') ? numeroCelda(fila[indices.get('id_proceso')!]) : null,
                    cod_proceso: codigo,
                    modelo: indices.has('modelo') ? textoCelda(fila[indices.get('modelo')!]) : null,
                    nombre: indices.has('nombre') ? textoCelda(fila[indices.get('nombre')!]) : null,
                    descripcion: textoCelda(fila[indices.get('descripcion')!]),
                    linea: indices.has('linea') ? textoCelda(fila[indices.get('linea')!]) : null,
                    costura: textoCelda(fila[indices.get('costura')!]),
                    t_costura: numeroCelda(fila[indices.get('t_costura')!]),
                    tiempo_total_costura: numeroCelda(fila[indices.get('tiempo_total_costura')!]),
                    tapizado: textoCelda(fila[indices.get('tapizado')!]),
                    t_tapizado: numeroCelda(fila[indices.get('t_tapizado')!]),
                    armado: textoCelda(fila[indices.get('armado')!]),
                    t_armado: numeroCelda(fila[indices.get('t_armado')!]),
                    montado: textoCelda(fila[indices.get('montado')!]),
                    t_montado: numeroCelda(fila[indices.get('t_montado')!]),
                    empaque: textoCelda(fila[indices.get('empaque')!]),
                    t_empaque: numeroCelda(fila[indices.get('t_empaque')!]),
                    corte: textoCelda(fila[indices.get('corte')!]),
                    t_corte: numeroCelda(fila[indices.get('t_corte')!])
                }
                const existente = productosPorCodigo.get(codigo)

                if (existente) {
                    // Si el archivo repite un código, prevalece la última fila, incluidos sus campos vacíos.
                    productosPorCodigo.set(codigo, producto)
                    codigosConsolidados++
                } else {
                    productosPorCodigo.set(codigo, producto)
                }
            }
        } else {
            const registros = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })

            for (const registro of registros) {
                const valores = new Map(
                    Object.entries(registro).map(([clave, valor]) => [normalizarEncabezado(clave), valor])
                )
                const codigo = textoCelda(valores.get('codigo')) || textoCelda(valores.get('cod_proceso'))

                if (!codigo) {
                    filasOmitidas++
                    continue
                }

                const tCostura = numeroCelda(valores.get('t_costura')) ?? numeroCelda(valores.get('tiempo'))
                const producto: ProductoTiempoImportado = {
                    id_proceso: null,
                    cod_proceso: codigo,
                    modelo: textoCelda(valores.get('modelo')),
                    nombre: textoCelda(valores.get('nombre')),
                    descripcion: textoCelda(valores.get('nombre_secundario')) || textoCelda(valores.get('descripcion')),
                    linea: textoCelda(valores.get('linea')),
                    costura: textoCelda(valores.get('costura')),
                    t_costura: tCostura,
                    tiempo_total_costura: numeroCelda(valores.get('tiempo_total_costura')),
                    tapizado: null,
                    t_tapizado: null,
                    armado: null,
                    t_armado: null,
                    montado: null,
                    t_montado: null,
                    empaque: null,
                    t_empaque: null,
                    corte: null,
                    t_corte: null
                }
                productosPorCodigo.set(codigo, producto)
            }
        }

        const productos = [...productosPorCodigo.values()]
        if (productos.length === 0) {
            return NextResponse.json(
                { success: false, message: 'No se encontraron filas con código de producto en el archivo.' },
                { status: 400 }
            )
        }

        await guardarProductos(productos)

        return NextResponse.json({
            success: true,
            message: `Archivo procesado. Se registraron o actualizaron ${productos.length} productos; se omitieron ${filasOmitidas} filas sin código y se consolidaron ${codigosConsolidados} códigos repetidos.`,
            productosProcesados: productos.length,
            filasOmitidas,
            codigosConsolidados
        })
    } catch (error) {
        console.error('Error al procesar el archivo de tiempos:', error)
        return NextResponse.json(
            { success: false, message: 'Error interno al procesar el archivo de tiempos.' },
            { status: 500 }
        )
    }
}
