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

const aliasEncabezados: Partial<Record<(typeof columnasProducto)[number], string[]>> = {
    cod_proceso: ['codigo'],
    descripcion: ['nombre secundario', 'nombre'],
    t_costura: ['tiempo costura', 'tiempo', 'tiempo de costura'],
    tiempo_total_costura: ['tiempo total']
}

const normalizarEncabezado = (valor: unknown) =>
    String(valor ?? '')
        .trim()
        .toLocaleLowerCase('es-MX')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')

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
        const indicesColumnas = new Map<(typeof columnasProducto)[number], number>()
        for (const columna of columnasProducto) {
            const nombresAceptados = [
                normalizarEncabezado(columna),
                ...(aliasEncabezados[columna] || [])
            ]
            const indice = nombresAceptados
                .map(normalizarEncabezado)
                .map(nombre => indices.get(nombre))
                .find(indice => indice !== undefined)

            if (indice !== undefined) indicesColumnas.set(columna, indice)
        }
        const leerCelda = (fila: unknown[], columna: (typeof columnasProducto)[number]) => {
            const indice = indicesColumnas.get(columna)
            return indice === undefined ? null : fila[indice]
        }
        const productosPorCodigo = new Map<string, ProductoTiempoImportado>()
        let filasOmitidas = 0
        let codigosConsolidados = 0

        for (const fila of filas.slice(1)) {
            const codigo = textoCelda(leerCelda(fila, 'cod_proceso'))
            if (!codigo) {
                filasOmitidas++
                continue
            }

            const producto: ProductoTiempoImportado = {
                id_proceso: numeroCelda(leerCelda(fila, 'id_proceso')),
                cod_proceso: codigo,
                modelo: textoCelda(leerCelda(fila, 'modelo')),
                nombre: textoCelda(leerCelda(fila, 'nombre')),
                descripcion: textoCelda(leerCelda(fila, 'descripcion')),
                linea: textoCelda(leerCelda(fila, 'linea')),
                costura: textoCelda(leerCelda(fila, 'costura')),
                t_costura: numeroCelda(leerCelda(fila, 't_costura')),
                tiempo_total_costura: numeroCelda(leerCelda(fila, 'tiempo_total_costura')),
                tapizado: textoCelda(leerCelda(fila, 'tapizado')),
                t_tapizado: numeroCelda(leerCelda(fila, 't_tapizado')),
                armado: textoCelda(leerCelda(fila, 'armado')),
                t_armado: numeroCelda(leerCelda(fila, 't_armado')),
                montado: textoCelda(leerCelda(fila, 'montado')),
                t_montado: numeroCelda(leerCelda(fila, 't_montado')),
                empaque: textoCelda(leerCelda(fila, 'empaque')),
                t_empaque: numeroCelda(leerCelda(fila, 't_empaque')),
                corte: textoCelda(leerCelda(fila, 'corte')),
                t_corte: numeroCelda(leerCelda(fila, 't_corte'))
            }
            if (productosPorCodigo.has(codigo)) codigosConsolidados++
            productosPorCodigo.set(codigo, producto)
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
            message: `Archivo procesado. Se registraron o actualizaron ${productos.length} productos; se omitieron ${filasOmitidas} filas sin código y se consolidaron ${codigosConsolidados} filas con código repetido.`,
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
