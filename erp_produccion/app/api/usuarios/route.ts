import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// GET: Consultar usuarios
export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM usuarios ORDER BY id ASC'
        );

        return NextResponse.json({
            success: true,
            user: rows
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        return NextResponse.json(
            { success: false, message: 'Error interno al consultar los usuarios' },
            { status: 500 }
        );
    }
}

// PUT: Modificar usuario existente
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, numero_empleado, nombre, area, tipo_usuario } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, message: 'El ID del usuario es requerido' },
                { status: 400 }
            );
        }

        const [result] = await pool.query<ResultSetHeader>(
            `UPDATE usuarios 
             SET numero_empleado = ?, nombre = ?, area = ?, tipo_usuario = ? 
             WHERE id = ?`,
            [numero_empleado, nombre, area, tipo_usuario, id]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json(
                { success: false, message: 'Usuario no encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Usuario actualizado correctamente'
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        return NextResponse.json(
            { success: false, message: 'Error interno al actualizar usuario' },
            { status: 500 }
        );
    }
}

// DELETE: Eliminar un usuario
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        let id = searchParams.get('id');

        if (!id) {
            try {
                const body = await request.json();
                id = body.id;
            } catch {
                // ignorar si no hay body
            }
        }

        if (!id) {
            return NextResponse.json(
                { success: false, message: 'El ID del usuario es requerido' },
                { status: 400 }
            );
        }

        const [result] = await pool.query<ResultSetHeader>(
            'DELETE FROM usuarios WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return NextResponse.json(
                { success: false, message: 'Usuario no encontrado' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        return NextResponse.json(
            { success: false, message: 'Error interno al eliminar usuario' },
            { status: 500 }
        );
    }
}