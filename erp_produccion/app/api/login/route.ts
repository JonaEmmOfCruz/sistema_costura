import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { RowDataPacket } from "mysql2";
import jwt from "jsonwebtoken";
import crypto from "crypto"

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret'

export async function POST(request: Request) {
    try {
        const { employeeId } = await request.json()

        if (!employeeId) {
            return NextResponse.json(
                { success: false, message: 'El número de empleado es requerido' },
                { status: 400 }
            )
        }

        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, numero_empleado, nombre, area, tipo_usuario FROM Usuarios WHERE numero_empleado = ?', 
            [employeeId]
        )

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, message: 'Número de empleado no encontrado' },
                { status: 404 }
            )
        }

        const user = rows[0]

        const [existingSessions] = await pool.query<RowDataPacket[]>(
            'SELECT token_jti FROM Sesiones WHERE usuario_id = ? AND expira_en > NOW() LIMIT 1', 
            [user.id]
        )

        let tokenJti: string;

        if (existingSessions.length > 0) {
            tokenJti = existingSessions[0].token_jti
        } else {
            tokenJti = crypto.randomUUID()
            const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000)

            await pool.query(
                'INSERT INTO Sesiones (usuario_id, token_jti, expira_en) VALUES (?, ?, ?)', 
                [user.id, tokenJti, expiresAt]
            )
        }

        const role = user.tipo_usuario === 'Administrador' ? 'admin' : 'operador'

        const token = jwt.sign(
            {
                jti: tokenJti,
                id: user.id,
                nombre: user.nombre,
                numero_empleado: user.numero_empleado,
                area: user.area,
                tipo_usuario: user.tipo_usuario
            },
            JWT_SECRET,
            { expiresIn: '5h' }
        )

        const response = NextResponse.json({
            success: true,
            message: 'Acceso autorizado',
            user: { ...user, role },
            token,
        })

        response.cookies.set({
            name: 'auth_token',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 5,
            path: '/',
        })

        return response

    } catch (error) {
        console.error('Error en el servidor:', error)

        return NextResponse.json(
            { success: false, message: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
