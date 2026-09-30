import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req: Request) {
    try {
        const { id } = await req.json()

        if (!id) {
            return NextResponse.json(
                { success: false, message: 'ID de operador no proporcionado' },
                { status: 400 }
            )
        }

        // Se asigna una fecha pasada para marcarlo como vencido/deshabilitado
        await pool.execute(
            'UPDATE operadores_disponibilidad SET disponible_hasta = "1970-01-01 00:00:00" WHERE usuario_id = ?',
            [id]
        )

        return NextResponse.json({
            success: true,
            message: 'Operador deshabilitado correctamente'
        })
    } catch (error) {
        console.error("Error al deshabilitar operador:", error)
        return NextResponse.json(
            { success: false, message: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}