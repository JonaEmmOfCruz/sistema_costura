import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";

export async function GET() {
    try {
        // --- 1. DATOS DE USUARIOS ---
        const [totalRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM Usuarios');
        const totalUsuarios = totalRows[0].total || 0;

        const [rolesRows] = await pool.query<RowDataPacket[]>(
            "SELECT tipo_usuario, COUNT(*) as count FROM Usuarios GROUP BY tipo_usuario"
        );
        
        let totalOperadores = 0;
        let totalAdmins = 0;

        rolesRows.forEach(row => {
            if (row.tipo_usuario === 'Operador') totalOperadores = row.count;
            if (row.tipo_usuario === 'Administrador') totalAdmins = row.count;
        });

        const operadoresPorcentaje = totalUsuarios > 0 ? Math.round((totalOperadores / totalUsuarios) * 100) : 0;
        const adminsPorcentaje = totalUsuarios > 0 ? Math.round((totalAdmins / totalUsuarios) * 100) : 0;

        const [areasRows] = await pool.query<RowDataPacket[]>(
            "SELECT area, COUNT(*) as count FROM Usuarios GROUP BY area"
        );

        const colores = ['bg-blue-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-amber-500', 'bg-purple-600'];
        
        const porArea = areasRows.map((row, index) => {
            const porcentaje = totalUsuarios > 0 ? Math.round((row.count / totalUsuarios) * 100) : 0;
            return {
                nombre: row.area || 'Sin área',
                cantidad: row.count,
                porcentaje,
                color: colores[index % colores.length]
            };
        });

        const totalAreas = porArea.length;

        // --- 2. DATOS DE ORDENES DE PRODUCCIÓN ---
        const [ordenesTotalRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as total, SUM(cantidad) as suma_cantidades FROM ordenes_produccion');
        const totalOrdenes = ordenesTotalRows[0].total || 0;
        const totalPiezasDemandadas = ordenesTotalRows[0].suma_cantidades || 0;

        const [prioridadRows] = await pool.query<RowDataPacket[]>(
            "SELECT prioridad, COUNT(*) as count FROM ordenes_produccion GROUP BY prioridad"
        );

        const porPrioridad = prioridadRows.map(row => ({
            nombre: row.prioridad || 'Normal',
            cantidad: row.count
        }));

        // --- 3. TIEMPOS DE COSTURA POR OPERADOR ---
        const [tiemposRows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                ot.op,
                ot.cantidad_asignada,
                ot.fecha_inicio,
                ot.fecha_fin,
                u.nombre AS operador
            FROM operador_tiempos_costura ot
            LEFT JOIN Usuarios u ON ot.id_operador = u.id
        `);

        const tiemposCostura = tiemposRows.map(row => {
            let minutos = 0;
            if (row.fecha_inicio && row.fecha_fin) {
                const inicio = new Date(row.fecha_inicio).getTime();
                const fin = new Date(row.fecha_fin).getTime();
                minutos = Math.max(0, Math.round((fin - inicio) / 60000));
            }

            const opText = row.op || 'Sin OP';
            const operadorText = row.operador || 'Desconocido';

            return {
                op: opText,
                operador: operadorText,
                cantidad_asignada: Number(row.cantidad_asignada) || 0,
                tiempo_minutos: minutos,
                label: `${opText} - ${operadorText}` // <-- Campo combinado para la gráfica
            };
        });

        const [asignacionesRows] = await pool.query<RowDataPacket[]>(`
            SELECT 
                nombre_operador AS operador,
                SUM(cantidad_asignada) AS total_asignado
            FROM admin_costura_asignaciones
            GROUP BY nombre_operador
        `);

        const asignacionesOperador = asignacionesRows.map(row => ({
            operador: row.operador || 'Sin asignar',
            cantidad_asignada: Number(row.total_asignado) || 0
        }));

        return NextResponse.json({
            success: true,
            stats: {
                totalUsuarios,
                totalOperadores,
                totalAdmins,
                totalAreas,
                totalOrdenes,
                totalPiezasDemandadas,
                porArea,
                porRol: {
                    operadoresPorcentaje,
                    adminsPorcentaje
                },
                porPrioridad,
                tiemposCostura,
                asignacionesOperador // <-- Nuevo campo añadido aquí
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return NextResponse.json(
            { success: false, message: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}