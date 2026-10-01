import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const op = searchParams.get('op') || searchParams.get('codigo')

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

        const [manuales]: any = await pool.query(query, queryParams)

        return NextResponse.json({ 
            success: true, 
            manuales 
        })
    } catch (error) {
        console.error('Error al obtener manuales:', error)
        return NextResponse.json({ success: false, message: 'Error del servidor' }, { status: 500 })
    }
}