import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RowDataPacket } from "mysql2";
import jwt from "jsonwebtoken";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const TABLAS_EXPORTABLES = [
    "admin_costura_asignaciones",
    "admin_costura_cortes",
    "admin_costura_ordenes",
    "admin_costura_ordenes_espera",
    "admin_costura_papelera",
    "manuales_produccion",
    "operador_tiempos_costura",
    "operadores_disponibilidad",
    "ordenes_produccion",
    "peticiones_tiempos",
    "productos_tiempos",
    "usuarios",
] as const;

const COLUMNA_FECHA_POR_TABLA: Record<typeof TABLAS_EXPORTABLES[number], string> = {
    admin_costura_asignaciones: "creado_en",
    admin_costura_cortes: "creado_en",
    admin_costura_ordenes: "vigente_desde",
    admin_costura_ordenes_espera: "fecha_espera",
    admin_costura_papelera: "eliminado_en",
    manuales_produccion: "fecha_subida",
    operador_tiempos_costura: "fecha_inicio",
    operadores_disponibilidad: "creado_en",
    ordenes_produccion: "vigente_desde",
    peticiones_tiempos: "fecha_solicitud",
    productos_tiempos: "fecha_actualizacion",
    usuarios: "created_at",
};

interface JwtAdminPayload extends jwt.JwtPayload {
    jti?: string;
    tipo_usuario?: string;
}

interface ColumnMetadataRow extends RowDataPacket {
    TABLE_NAME: string;
    COLUMN_NAME: string;
    DATA_TYPE: string;
}

interface ExportColumn {
    name: string;
    dataType: string;
    exportName: string;
}

interface ExportTable {
    name: string;
    columns: string[];
    rows: unknown[][];
    totalRows?: number;
}

function errorResponse(message: string, status: number) {
    return NextResponse.json(
        { success: false, message },
        { status, headers: { "Cache-Control": "no-store" } },
    );
}

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        if (!token) return errorResponse("No autorizado", 401);

        let verified: JwtAdminPayload;
        try {
            const payload = jwt.verify(token, JWT_SECRET);
            if (typeof payload === "string" || !payload.jti) {
                return errorResponse("Token inválido", 401);
            }
            verified = payload as JwtAdminPayload;
        } catch {
            return errorResponse("Token inválido o expirado", 401);
        }

        if (verified.tipo_usuario !== "Administrador") {
            return errorResponse("No autorizado", 403);
        }

        const [sessionRows] = await pool.query<RowDataPacket[]>(
            "SELECT token_jti FROM sesiones WHERE token_jti = ? AND expira_en > NOW()",
            [verified.jti],
        );
        if (sessionRows.length === 0) {
            return errorResponse("La sesión expiró o fue cerrada", 401);
        }

        const searchParams = new URL(request.url).searchParams;
        const dateFrom = searchParams.get("desde");
        const dateTo = searchParams.get("hasta");
        const requestedTable = searchParams.get("tabla");
        const summaryOnly = searchParams.get("resumen") === "1";
        if (requestedTable && !TABLAS_EXPORTABLES.includes(requestedTable as typeof TABLAS_EXPORTABLES[number])) {
            return errorResponse("La tabla solicitada no está disponible para exportación", 400);
        }
        if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
            return errorResponse("Indica ambas fechas para exportar por periodo", 400);
        }
        if (dateFrom && dateTo) {
            const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
                && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
                && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
            if (!validDate(dateFrom) || !validDate(dateTo) || dateFrom > dateTo) {
                return errorResponse("El rango de fechas no es válido", 400);
            }
        }

        const tablasSolicitadas = requestedTable
            ? [requestedTable as typeof TABLAS_EXPORTABLES[number]]
            : TABLAS_EXPORTABLES;
        const [metadata] = await pool.query<ColumnMetadataRow[]>(
            `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
             FROM information_schema.columns
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME IN (?)
             ORDER BY TABLE_NAME, ORDINAL_POSITION`,
            [tablasSolicitadas],
        );

        const columnasPorTabla = new Map<string, ExportColumn[]>();
        for (const column of metadata) {
            if (/password|contrasena|senha|secret|token|hash|credential|clave/i.test(column.COLUMN_NAME)) {
                continue;
            }
            const columns = columnasPorTabla.get(column.TABLE_NAME) ?? [];
            columns.push({
                name: column.COLUMN_NAME,
                dataType: column.DATA_TYPE,
                exportName: column.COLUMN_NAME === "tiempo_segundos" ? "tiempo_minutos" : column.COLUMN_NAME,
            });
            columnasPorTabla.set(column.TABLE_NAME, columns);
        }

        const tables: ExportTable[] = [];
        for (const name of tablasSolicitadas) {
            const columns = columnasPorTabla.get(name) ?? [];
            if (columns.length === 0) {
                throw new Error(`No se encontraron columnas exportables para ${name}`);
            }

            const hasOperatorId = columns.some(column => column.name === "id_operador");
            const hasOperatorName = columns.some(column => column.name === "nombre_operador");
            const columnList = columns.map(({ name: columnName, dataType, exportName }) => {
                const quotedName = `exportada.\`${columnName.replace(/`/g, "``")}\``;
                if (columnName === "tiempo_segundos") {
                    return `ROUND(${quotedName} / 60, 2) AS \`${exportName}\``;
                }
                if (columnName === "id_operador") {
                    const operatorName = hasOperatorName
                        ? "COALESCE(operador_usuario.nombre, exportada.`nombre_operador`, 'No encontrado')"
                        : "COALESCE(operador_usuario.nombre, 'No encontrado')";
                    return `${operatorName} AS \`${columnName}\``;
                }
                if (["date", "datetime", "timestamp", "time", "year"].includes(dataType.toLowerCase())) {
                    return `CAST(${quotedName} AS CHAR) AS \`${columnName}\``;
                }
                return `${quotedName} AS \`${columnName}\``;
            }).join(", ");
            const dateColumn = COLUMNA_FECHA_POR_TABLA[name];
            const dateColumnExists = columns.some(column => column.name === dateColumn);
            if (!dateColumnExists) {
                throw new Error(`No se encontró la columna de fecha ${dateColumn} en ${name}`);
            }
            const whereClause = dateFrom && dateTo
                ? ` WHERE exportada.\`${dateColumn}\` >= ? AND exportada.\`${dateColumn}\` < DATE_ADD(?, INTERVAL 1 DAY)`
                : "";
            const queryValues = dateFrom && dateTo ? [dateFrom, dateTo] : [];
            if (summaryOnly) {
                const [countRows] = await pool.query<RowDataPacket[]>(
                    `SELECT COUNT(*) AS total FROM \`${name}\` AS exportada${whereClause}`,
                    queryValues,
                );
                tables.push({
                    name,
                    columns: columns.map(column => column.exportName),
                    rows: [],
                    totalRows: Number(countRows[0]?.total ?? 0),
                });
                continue;
            }
            const operatorJoin = hasOperatorId
                ? " LEFT JOIN `usuarios` AS operador_usuario ON operador_usuario.`id` = exportada.`id_operador`"
                : "";
            const [rows] = await pool.query<RowDataPacket[]>(
                `SELECT ${columnList} FROM \`${name}\` AS exportada${operatorJoin}${whereClause}`,
                queryValues,
            );
            tables.push({
                name,
                columns: columns.map(column => column.exportName),
                rows: rows.map(row => columns.map(column => row[column.exportName] ?? null)),
                totalRows: rows.length,
            });
        }

        return NextResponse.json(
            { success: true, tables, generatedAt: new Date().toISOString() },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("Error al preparar la exportación de datos:", error);
        return errorResponse("No se pudo cargar la información de la base de datos", 500);
    }
}
