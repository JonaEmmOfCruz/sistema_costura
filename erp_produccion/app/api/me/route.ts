import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { RowDataPacket } from "mysql2";
import jwt from "jsonwebtoken";

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

        const decoded: any = jwt.verify(token, JWT_SECRET)

        const [sessionRows] = await pool.query<RowDataPacket[]>(
            'select * from Sesiones where token_jti = ? and expira_en > now()', [decoded.jti]
        )

        return NextResponse.json({
            success: true,
            user: decoded
        })
    } catch (error) {
        return NextResponse.json({success: false, message: "Token inválido o expirado"})
    }
}