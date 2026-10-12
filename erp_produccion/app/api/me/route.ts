import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { RowDataPacket } from "mysql2";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret'

export async function GET(request: Request) {
    try {
        const cookieHeader = request.headers.get("cookie")
        if (!cookieHeader) {
            return NextResponse.json({success: false, message: "No autorizado"}, {status: 401})
        }

        const cookies = Object.fromEntries(
            cookieHeader.split("; ").map(c => {
                const [key, ...v] = c.split("=")
                return [key, v.join("=")]
            })
        )

        const token = cookies["auth_token"]

        if (!token) {
            return NextResponse.json({success: false, message: "Token no encontrado"})
        }

        let decoded: jwt.JwtPayload
        try {
            const verified = jwt.verify(token, JWT_SECRET)
            if (typeof verified === 'string' || !verified.jti) {
                return NextResponse.json(
                    { success: false, message: "Token inválido" },
                    { status: 401 }
                )
            }
            decoded = verified
        } catch {
            return NextResponse.json(
                { success: false, message: "Token inválido o expirado" },
                { status: 401 }
            )
        }

        const [sessionRows] = await pool.query<RowDataPacket[]>(
            'select token_jti from Sesiones where token_jti = ? and expira_en > now()', [decoded.jti]
        )

        if (sessionRows.length === 0) {
            return NextResponse.json(
                { success: false, message: "La sesión expiró o fue cerrada" },
                { status: 401 }
            )
        }

        return NextResponse.json({
            success: true,
            user: decoded
        })
    } catch (error) {
        console.error("Error al verificar sesión:", error)
        return NextResponse.json(
            { success: false, message: "No se pudo verificar la sesión" },
            { status: 500 }
        )
    }
}