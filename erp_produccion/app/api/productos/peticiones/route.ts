import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { pageMetadata, pageRows, readPageParams } from '@/lib/pagination'

// GET: Obtener todas las peticiones pendientes registradas
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { page, pageSize, offset } = readPageParams(request)
        const [peticiones]: any = await pool.query(
            `SELECT p.id, p.op, p.modelo, p.codigo, p.nombre_secundario, p.estatus, p.fecha_solicitud
             FROM peticiones_tiempos p
             WHERE LOWER(p.estatus) = 'pendiente'
               AND NOT EXISTS (
                   SELECT 1
                   FROM productos_tiempos pt
                   WHERE pt.t_costura > 0
                     AND (
                         pt.cod_proceso LIKE CONCAT(LEFT(TRIM(p.codigo), 7), '%')
                         OR LOWER(TRIM(pt.descripcion)) = LOWER(TRIM(p.nombre_secundario))
                     )
               )
             ORDER BY p.id DESC
             LIMIT ? OFFSET ?`,
            [pageSize + 1, offset]
        )

        return NextResponse.json({ 
            success: true, 
            peticiones: Array.isArray(peticiones) ? pageRows(peticiones, pageSize) : [],
            pagination: pageMetadata(page, pageSize, peticiones.length)
        })
    } catch (error) {
        console.error('Error al consultar peticiones pendientes:', error)
        return NextResponse.json({ 
            success: false, 
            message: 'Error interno al consultar peticiones', 
            peticiones: [] 
        }, { status: 500 })
    }
}

// POST: Registrar una nueva petición
export async function POST(request: Request) {
    try {
        const { op, modelo, codigo, nombre_secundario } = await request.json()

        if (!modelo || !codigo) {
            return NextResponse.json({ success: false, message: 'Faltan datos obligatorios (modelo o código)' }, { status: 400 })
        }

        // 1. Verificar si ya existe una petición pendiente para esta OP o Código
        const [existentes]: any = await pool.query(
            `SELECT id FROM peticiones_tiempos 
             WHERE (codigo = ? OR (op != '' AND op = ?)) AND LOWER(estatus) = 'pendiente' 
             LIMIT 1`,
            [codigo, op || '']
        )

        if (existentes.length > 0) {
            return NextResponse.json({ 
                success: true, 
                message: 'La solicitud para este producto ya se encuentra registrada y pendiente.' 
            })
        }

        // 2. Si no existe, insertar registro único
        await pool.query(
            `INSERT INTO peticiones_tiempos (op, modelo, codigo, nombre_secundario, estatus)
             VALUES (?, ?, ?, ?, 'pendiente')`,
            [op || '', modelo, codigo, nombre_secundario || '']
        )

        return NextResponse.json({ success: true, message: 'Petición registrada correctamente' })
    } catch (error) {
        console.error('Error al guardar la petición:', error)
        return NextResponse.json({ success: false, message: 'Error al guardar la petición' }, { status: 500 })
    }
}
