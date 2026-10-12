import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RowDataPacket } from "mysql2";
import jwt from "jsonwebtoken";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const PRODUCT_TIME_JOIN = `LEFT JOIN (
    SELECT codigo, MAX(
        CASE
            WHEN tiempo REGEXP '^[0-9]+([.][0-9]+)?$' THEN CAST(tiempo AS DECIMAL(12, 2))
            ELSE NULL
        END
    ) AS tiempo_segundos
    FROM productos_tiempos
    GROUP BY codigo
) AS pt ON pt.codigo = t.producto`;

interface JwtAdminPayload extends jwt.JwtPayload {
    jti?: string;
    tipo_usuario?: string;
}

interface AnalysisRow extends RowDataPacket {
    [key: string]: unknown;
}

interface OperatorMetric {
    nombre: string;
    ordenesTerminadas: number;
    piezas: number;
    minutosTrabajados: number;
    minutosEstimados: number | null;
    minutosPorPieza: number;
    cumplimientoSugerido: number | null;
}

interface TrendMetric {
    fecha: string;
    piezasCostura: number;
    piezasCorte: number;
}

function errorResponse(message: string, status: number) {
    return NextResponse.json(
        { success: false, message },
        { status, headers: { "Cache-Control": "no-store" } },
    );
}

function numeric(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function dayBefore(date: string): string {
    return new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10);
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

        const [sessions] = await pool.query<RowDataPacket[]>(
            "SELECT token_jti FROM sesiones WHERE token_jti = ? AND expira_en > NOW()",
            [verified.jti],
        );
        if (sessions.length === 0) return errorResponse("La sesión expiró o fue cerrada", 401);

        const params = new URL(request.url).searchParams;
        const from = params.get("desde");
        const to = params.get("hasta");
        if ((from && !to) || (!from && to)) {
            return errorResponse("Selecciona ambas fechas para consultar un periodo", 400);
        }

        if (from && to) {
            const isValidDate = (value: string) =>
                /^\d{4}-\d{2}-\d{2}$/.test(value)
                && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
                && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
            if (!isValidDate(from) || !isValidDate(to) || from > to) {
                return errorResponse("El rango de fechas no es válido", 400);
            }
            const days = (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000;
            if (days > 366) return errorResponse("El periodo máximo de análisis es de 366 días", 400);
        }

        const hasRange = Boolean(from && to);
        const fromDate = hasRange ? from! : null;
        const endExclusive = hasRange ? new Date(Date.parse(`${to}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10) : null;
        const analysisStart = fromDate ?? new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10);
        const analysisEndExclusive = endExclusive ?? new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
        const sewingPeriodSql = hasRange ? " AND t.fecha_fin >= ? AND t.fecha_fin < ?" : "";
        const sewingPeriodValues = hasRange ? [fromDate, endExclusive] : [];
        const cutPeriodSql = hasRange ? " AND c.fecha_fin >= ? AND c.fecha_fin < ?" : "";
        const cutPeriodValues = hasRange ? [fromDate, endExclusive] : [];

        const [
            [sewingRows],
            [operatorRows],
            [cutSummaryRows],
            [cutStatusRows],
            [assignmentRows],
            [waitingRows],
            [overdueRows],
            [sewingTrendRows],
            [cutTrendRows],
        ] = await Promise.all([
            pool.query<AnalysisRow[]>(`
                SELECT
                    COUNT(*) AS ordenes_terminadas,
                    COALESCE(SUM(t.cantidad_asignada), 0) AS piezas,
                    COALESCE(SUM(COALESCE(t.tiempo_segundos, TIMESTAMPDIFF(SECOND, t.fecha_inicio, t.fecha_fin))), 0) AS segundos_trabajados,
                    COALESCE(SUM(CASE WHEN pt.tiempo_segundos IS NOT NULL THEN pt.tiempo_segundos * t.cantidad_asignada ELSE 0 END), 0) AS segundos_sugeridos
                FROM operador_tiempos_costura AS t
                ${PRODUCT_TIME_JOIN}
                WHERE t.fecha_fin IS NOT NULL
                  AND COALESCE(t.tiempo_segundos, TIMESTAMPDIFF(SECOND, t.fecha_inicio, t.fecha_fin)) > 0
                  ${sewingPeriodSql}
            `, sewingPeriodValues),
            pool.query<AnalysisRow[]>(`
                SELECT
                    COALESCE(u.nombre, 'Operador sin usuario') AS nombre,
                    COUNT(*) AS ordenes_terminadas,
                    COALESCE(SUM(t.cantidad_asignada), 0) AS piezas,
                    COALESCE(SUM(COALESCE(t.tiempo_segundos, TIMESTAMPDIFF(SECOND, t.fecha_inicio, t.fecha_fin))), 0) AS segundos_trabajados,
                    COALESCE(SUM(CASE WHEN pt.tiempo_segundos IS NOT NULL THEN pt.tiempo_segundos * t.cantidad_asignada ELSE 0 END), 0) AS segundos_sugeridos
                FROM operador_tiempos_costura AS t
                LEFT JOIN usuarios AS u ON u.id = t.id_operador
                ${PRODUCT_TIME_JOIN}
                WHERE t.fecha_fin IS NOT NULL
                  AND COALESCE(t.tiempo_segundos, TIMESTAMPDIFF(SECOND, t.fecha_inicio, t.fecha_fin)) > 0
                  ${sewingPeriodSql}
                GROUP BY u.id, u.nombre
                ORDER BY piezas DESC, segundos_trabajados ASC
                LIMIT 12
            `, sewingPeriodValues),
            pool.query<AnalysisRow[]>(`
                SELECT
                    COUNT(*) AS ordenes_cortadas,
                    COALESCE(SUM(c.cantidad), 0) AS piezas_cortadas,
                    COALESCE(AVG(TIMESTAMPDIFF(SECOND, c.fecha_inicio, c.fecha_fin)), 0) AS segundos_promedio_corte
                FROM admin_costura_cortes AS c
                WHERE c.estatus = 'cortada' AND c.fecha_fin IS NOT NULL
                  ${cutPeriodSql}
            `, cutPeriodValues),
            pool.query<AnalysisRow[]>(`
                SELECT
                    estatus,
                    COUNT(*) AS ordenes,
                    COALESCE(SUM(cantidad), 0) AS piezas
                FROM admin_costura_cortes
                GROUP BY estatus
            `),
            pool.query<AnalysisRow[]>(`
                SELECT
                    COUNT(DISTINCT id_operador) AS operadores_con_asignacion,
                    COUNT(*) AS asignaciones_activas,
                    COALESCE(SUM(cantidad_asignada), 0) AS piezas_asignadas
                FROM admin_costura_asignaciones
                WHERE estatus IN ('asignado', 'pausado') OR estatus IS NULL
            `),
            pool.query<AnalysisRow[]>(
                "SELECT COUNT(*) AS ordenes_en_espera FROM admin_costura_ordenes_espera",
            ),
            pool.query<AnalysisRow[]>(`
                SELECT COUNT(*) AS ordenes_vencidas
                FROM admin_costura_ordenes AS o
                LEFT JOIN admin_costura_cortes AS c ON c.orden_id = o.id
                WHERE o.fecha_de_entrega < CURRENT_DATE
                  AND (c.id IS NULL OR c.estatus <> 'cortada')
            `),
            pool.query<AnalysisRow[]>(`
                SELECT DATE_FORMAT(t.fecha_fin, '%Y-%m-%d') AS fecha, COALESCE(SUM(t.cantidad_asignada), 0) AS piezas
                FROM operador_tiempos_costura AS t
                WHERE t.fecha_fin IS NOT NULL
                  AND t.fecha_fin >= ? AND t.fecha_fin < ?
                GROUP BY DATE_FORMAT(t.fecha_fin, '%Y-%m-%d')
                ORDER BY fecha
            `, [analysisStart, analysisEndExclusive]),
            pool.query<AnalysisRow[]>(`
                SELECT DATE_FORMAT(c.fecha_fin, '%Y-%m-%d') AS fecha, COALESCE(SUM(c.cantidad), 0) AS piezas
                FROM admin_costura_cortes AS c
                WHERE c.estatus = 'cortada' AND c.fecha_fin IS NOT NULL
                  AND c.fecha_fin >= ? AND c.fecha_fin < ?
                GROUP BY DATE_FORMAT(c.fecha_fin, '%Y-%m-%d')
                ORDER BY fecha
            `, [analysisStart, analysisEndExclusive]),
        ]);

        const sewing = sewingRows[0] ?? {};
        const sewingPieces = numeric(sewing.piezas);
        const sewingSeconds = numeric(sewing.segundos_trabajados);
        const suggestedSeconds = numeric(sewing.segundos_sugeridos);
        const operatorMetrics: OperatorMetric[] = operatorRows.map(row => {
            const seconds = numeric(row.segundos_trabajados);
            const suggested = numeric(row.segundos_sugeridos);
            return {
                nombre: String(row.nombre ?? "Operador sin usuario"),
                ordenesTerminadas: numeric(row.ordenes_terminadas),
                piezas: numeric(row.piezas),
                minutosTrabajados: Math.round(seconds / 60),
                minutosEstimados: suggested > 0 ? Math.round(suggested / 60) : null,
                minutosPorPieza: numeric(row.piezas) > 0 ? seconds / 60 / numeric(row.piezas) : 0,
                cumplimientoSugerido: suggested > 0 && seconds > 0 ? suggested / seconds * 100 : null,
            };
        });
        const sewingTrend = new Map<string, TrendMetric>();
        for (const row of sewingTrendRows) {
            const date = String(row.fecha).slice(0, 10);
            sewingTrend.set(date, { fecha: date, piezasCostura: numeric(row.piezas), piezasCorte: 0 });
        }
        for (const row of cutTrendRows) {
            const date = String(row.fecha).slice(0, 10);
            const existing = sewingTrend.get(date) ?? { fecha: date, piezasCostura: 0, piezasCorte: 0 };
            existing.piezasCorte = numeric(row.piezas);
            sewingTrend.set(date, existing);
        }

        const cutStatus = {
            enProceso: 0,
            porAsignar: 0,
            cortadas: 0,
            otras: 0,
            piezasEnProceso: 0,
            piezasPorAsignar: 0,
            piezasCortadas: 0,
        };
        for (const row of cutStatusRows) {
            const status = String(row.estatus ?? "").toLowerCase();
            const orders = numeric(row.ordenes);
            const pieces = numeric(row.piezas);
            if (status === "corte en proceso") {
                cutStatus.enProceso += orders;
                cutStatus.piezasEnProceso += pieces;
            } else if (status === "asignado" || status === "asignacion parcial") {
                cutStatus.porAsignar += orders;
                cutStatus.piezasPorAsignar += pieces;
            } else if (status === "cortada") {
                cutStatus.cortadas += orders;
                cutStatus.piezasCortadas += pieces;
            } else {
                cutStatus.otras += orders;
            }
        }

        return NextResponse.json({
            success: true,
            period: hasRange ? { desde: fromDate, hasta: to } : null,
            sewing: {
                ordenesTerminadas: numeric(sewing.ordenes_terminadas),
                piezas: sewingPieces,
                minutosTrabajados: Math.round(sewingSeconds / 60),
                minutosPorPieza: sewingPieces > 0 ? sewingSeconds / 60 / sewingPieces : 0,
                cumplimientoSugerido: suggestedSeconds > 0 && sewingSeconds > 0
                    ? suggestedSeconds / sewingSeconds * 100
                    : null,
            },
            operators: operatorMetrics,
            cutting: {
                ordenesTerminadas: numeric(cutSummaryRows[0]?.ordenes_cortadas),
                piezasTerminadas: numeric(cutSummaryRows[0]?.piezas_cortadas),
                minutosPromedioPorOrden: numeric(cutSummaryRows[0]?.segundos_promedio_corte) / 60,
                ...cutStatus,
                ordenesEnEspera: numeric(waitingRows[0]?.ordenes_en_espera),
                ordenesVencidas: numeric(overdueRows[0]?.ordenes_vencidas),
            },
            assignments: {
                operadoresActivos: numeric(assignmentRows[0]?.operadores_con_asignacion),
                asignacionesActivas: numeric(assignmentRows[0]?.asignaciones_activas),
                piezasAsignadas: numeric(assignmentRows[0]?.piezas_asignadas),
            },
            trend: [...sewingTrend.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)),
            trendPeriod: { desde: analysisStart, hasta: dayBefore(analysisEndExclusive) },
            generatedAt: new Date().toISOString(),
        }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Error al preparar el análisis de producción:", error);
        return errorResponse("No se pudo cargar el análisis de producción", 500);
    }
}
