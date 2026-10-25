import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import { tiempoCosturaPorPrefijoSql } from "@/lib/productosTiempos";
import { pageMetadata, pageRows, readPageParams } from "@/lib/pagination";
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
    try {
        const { page, pageSize, offset } = readPageParams(request)
        const dataset = new URL(request.url).searchParams.get('dataset')
        let rows: RowDataPacket[] = []
        let enEspera: RowDataPacket[] = []

        if (dataset !== 'espera') {
            ;[rows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                o.*, 
                c.estatus AS estado,
                ${tiempoCosturaPorPrefijoSql('o')} AS tiempo_base
            FROM admin_costura_ordenes o
            LEFT JOIN admin_costura_cortes c ON o.id = c.orden_id
            LEFT JOIN admin_costura_ordenes_espera e ON e.orden_id = o.id
            WHERE e.orden_id IS NULL
              AND (c.estatus IS NULL OR c.estatus = 'corte en proceso')
            ORDER BY CASE WHEN c.estatus = 'corte en proceso' THEN 0 ELSE 1 END, o.id ASC
            LIMIT ? OFFSET ?
            `, [pageSize + 1, offset])
        }

        if (dataset !== 'ordenes') {
            ;[enEspera] = await pool.query<RowDataPacket[]>(`
            SELECT
                o.*,
                e.motivo AS motivo_espera,
                e.fecha_espera,
                ${tiempoCosturaPorPrefijoSql('o')} AS tiempo_base
            FROM admin_costura_ordenes_espera e
            INNER JOIN admin_costura_ordenes o ON o.id = e.orden_id
            ORDER BY e.fecha_espera ASC
            LIMIT ? OFFSET ?
            `, [pageSize + 1, offset])
        }

        return NextResponse.json({
            success: true,
            ordenes: pageRows(rows, pageSize),
            en_espera: pageRows(enEspera, pageSize),
            pagination: dataset === 'ordenes'
                ? pageMetadata(page, pageSize, rows.length)
                : dataset === 'espera'
                    ? pageMetadata(page, pageSize, enEspera.length)
                    : {
                        ordenes: pageMetadata(page, pageSize, rows.length),
                        en_espera: pageMetadata(page, pageSize, enEspera.length),
                    }
        })
    } catch (error) {
        console.error('Error al obtener las ordenes de produccion', error)
        return NextResponse.json(
            { success: false, message: 'Error interno al consultar las ordenes' },
            { status: 500 }
        )
    }
}
