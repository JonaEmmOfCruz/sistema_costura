import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
    try {
        // Hacemos LEFT JOIN con 'usuarios' y con 'ordenes_produccion'
        const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                a.id,
                a.orden_id,
                a.rq,
                a.op,
                a.producto,
                a.nombre,
                a.cantidad_asignada,
                a.creado_en,
                a.id_operador,
                COALESCE(u.nombre, a.nombre_operador) AS nombre_operador,
                o.vigente_desde,
                o.fecha_de_entrega
            FROM admin_costura_asignaciones a
            LEFT JOIN usuarios u ON a.id_operador = u.id
            LEFT JOIN ordenes_produccion o ON a.op = o.op
            ORDER BY a.id DESC
        `);

        return NextResponse.json({
            success: true,
            asignaciones: rows
        });
    } catch (error) {
        console.error('Error al obtener las asignaciones de costura', error);
        return NextResponse.json(
            { success: false, message: 'Error interno al consultar las asignaciones' },
            { status: 500 }
        );
    }
}