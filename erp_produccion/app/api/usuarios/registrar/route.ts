import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export async function POST(request: Request) {
    try {
        const { numero_empleado, nombre, area, tipo_usuario } = await request.json();

        if (!numero_empleado || !nombre || !area || !tipo_usuario) {
            return NextResponse.json(
                { success: false, message: 'Todos los campos son obligatorios' },
                { status: 400 }
            );
        }

        // 1. Obtener y verificar el token JWT de la cookie del administrador autenticado
        const cookieStore = cookies();
        const authToken = (await cookieStore).get('auth_token')?.value;

        let tokenJti = 'SISTEMA';

        if (authToken) {
            try {
                const decoded: any = jwt.verify(authToken, JWT_SECRET);
                if (decoded && decoded.jti) {
                    tokenJti = decoded.jti; // Extraemos el token_jti directamente del payload del JWT
                }
            } catch (jwtError) {
                console.error('Error al decodificar el token de sesión:', jwtError);
            }
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 2. Asignar el token_jti a la variable de sesión de MySQL para que el Trigger lo lea
            await connection.query('SET @current_token_jtl = ?', [tokenJti]);

            // 3. Verificar si el número de empleado ya está registrado
            const [existing] = await connection.query<RowDataPacket[]>(
                'SELECT id FROM Usuarios WHERE numero_empleado = ?', [numero_empleado]
            );

            if (existing.length > 0) {
                await connection.rollback();
                connection.release();
                return NextResponse.json(
                    { success: false, message: 'El número de empleado ya esta registrado' },
                    { status: 409 }
                );
            }

            // 4. Insertar el nuevo usuario (Esto activará el trigger de MySQL usando el @current_token_jtl)
            const [result] = await connection.query<ResultSetHeader>(
                'INSERT INTO Usuarios (numero_empleado, nombre, area, tipo_usuario) VALUES (?, ?, ?, ?)', 
                [numero_empleado, nombre, area, tipo_usuario]
            );

            await connection.commit();
            connection.release();

            return NextResponse.json({
                success: true,
                message: 'Usuario registrado correctamente',
                userId: result.insertId
            });

        } catch (dbError) {
            await connection.rollback();
            connection.release();
            throw dbError;
        }

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        return NextResponse.json(
            { success: false, message: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}