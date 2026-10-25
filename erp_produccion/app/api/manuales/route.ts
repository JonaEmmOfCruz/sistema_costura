import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { pageMetadata, pageRows, readPageParams } from '@/lib/pagination'

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const op = searchParams.get('op') || searchParams.get('codigo')
        const { page, pageSize, offset } = readPageParams(request)

        let query = `SELECT * FROM manuales_produccion`
        const queryParams: any[] = []

        if (op) {
            // Separa la OP por guiones "102-1361N-00-23" -> partes[1] = "1361N"
            const partes = op.split('-')
            const segundoString = partes.length >= 2 ? partes[1].trim() : op.trim()

            query += ` WHERE codigo_relacion = ? OR nombre_original LIKE ?`
            queryParams.push(segundoString, `%${segundoString}%`)
        }

        query += ` ORDER BY id DESC`
        if (!op) query += ` LIMIT ? OFFSET ?`

        const [manuales]: any = await pool.query(query, op ? queryParams : [...queryParams, pageSize + 1, offset])

        return NextResponse.json({ 
            success: true, 
            manuales: op ? manuales : pageRows(manuales, pageSize),
            ...(!op ? { pagination: pageMetadata(page, pageSize, manuales.length) } : {})
        })
    } catch (error) {
        console.error('Error al obtener manuales:', error)
        return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
    }
}
