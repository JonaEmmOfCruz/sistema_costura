'use client'

import { Icon } from "@iconify/react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface TiemposCosturaStat {
    op: string;
    operador: string;
    cantidad_asignada: number;
    tiempo_minutos: number;
    label: string;
}

interface AsignacionOperadorStat {
    operador: string;
    cantidad_asignada: number;
}

interface StatsData {
    totalUsuarios: number;
    totalOperadores: number;
    totalAdmins: number;
    totalAreas: number;
    totalOrdenes: number;
    totalPiezasDemandadas: number;
    porArea: { nombre: string; cantidad: number; porcentaje: number; color: string }[];
    porRol: { operadoresPorcentaje: number; adminsPorcentaje: number };
    porPrioridad: { nombre: string; cantidad: number }[];
    tiemposCostura?: TiemposCosturaStat[];
    asignacionesOperador?: AsignacionOperadorStat[]; // <-- Interfaz añadida
}

interface UserStatsGridProps {
    stats: StatsData;
}

export default function UserStatsGrid({ stats }: UserStatsGridProps) {
    const rolesData = [
        { name: 'Operadores', value: stats.totalOperadores, color: '#2563eb' },
        { name: 'Administradores', value: stats.totalAdmins, color: '#9333ea' }
    ]

    return (
        <div className="space-y-6">
            {/* Grid de Tarjetas de Resumen (KPIs) - Incluyendo Órdenes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Usuarios</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalUsuarios}</h3>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Icon icon="lucide:users" className="text-xl" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Operadores</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalOperadores}</h3>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Icon icon="lucide:user-check" className="text-xl" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Admins</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalAdmins}</h3>
                    </div>
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                        <Icon icon="lucide:shield-check" className="text-xl" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Áreas</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalAreas}</h3>
                    </div>
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <Icon icon="lucide:layers" className="text-xl" />
                    </div>
                </div>

                {/* Nuevas KPIs de Producción */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Órdenes</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalOrdenes}</h3>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Icon icon="lucide:file-spreadsheet" className="text-xl" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Piezas Req.</p>
                        <h3 className="text-2xl font-bold text-gray-800 mt-1">{stats.totalPiezasDemandadas}</h3>
                    </div>
                    <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                        <Icon icon="lucide:package" className="text-xl" />
                    </div>
                </div>
            </div>

            {/* Grid de Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Gráfica 1: Usuarios por Área */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-base font-bold text-gray-800 mb-4">Usuarios por Área de Producción</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.porArea} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="nombre" stroke="#4b5563" fontSize={12} tickLine={false} />
                                <YAxis stroke="#4b5563" fontSize={12} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: '12px', color: '#4b5563' }} />
                                <Bar dataKey="cantidad" fill="#2563eb" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfica 2: Proporción de Roles */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-bold text-gray-800 mb-1">Proporción de Roles del Sistema</h3>
                        <p className="text-xs text-gray-600 mb-2">Distribución porcentual de accesos</p>
                    </div>

                    <div className="h-56 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={rolesData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={6}
                                    dataKey="value"
                                >
                                    {rolesData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: '12px', color: '#4b5563' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex justify-center items-center gap-6 text-xs text-gray-700 pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-blue-600 rounded-full inline-block"></span>
                            <span>Operadores ({stats.porRol.operadoresPorcentaje}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-purple-600 rounded-full inline-block"></span>
                            <span>Administradores ({stats.porRol.adminsPorcentaje}%)</span>
                        </div>
                    </div>
                </div>

                {/* NUEVA GRÁFICA: Cantidades Asignadas por Operador (admin_costura_asignaciones) */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-base font-bold text-gray-800">Cantidad Asignada por Operador</h3>
                            <p className="text-xs text-gray-600">Total de piezas acumuladas por operador en asignaciones actuales</p>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.asignacionesOperador || []} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                                <XAxis 
                                    dataKey="operador" 
                                    stroke="#4b5563" 
                                    fontSize={11} 
                                    tickLine={false} 
                                    interval={0}
                                    angle={-20}
                                    textAnchor="end"
                                />
                                <YAxis stroke="#2563eb" fontSize={12} tickLine={false} allowDecimals={false} />
                                <Tooltip 
                                    contentStyle={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: '12px', color: '#4b5563' }}
                                    formatter={(value: any) => [value, 'Cantidad Asignada']}
                                />
                                <Bar dataKey="cantidad_asignada" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfica: Tiempos de Costura por OP y Operador */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-base font-bold text-gray-800">Tiempos y Cantidades de Costura por OP y Operador</h3>
                            <p className="text-xs text-gray-600">Rendimiento por orden y operador registrado</p>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.tiemposCostura || []} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                                <XAxis 
                                    dataKey="label" 
                                    stroke="#4b5563" 
                                    fontSize={11} 
                                    tickLine={false} 
                                    interval={0}
                                    angle={-25}
                                    textAnchor="end"
                                />
                                <YAxis yAxisId="left" stroke="#2563eb" fontSize={12} tickLine={false} allowDecimals={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={12} tickLine={false} allowDecimals={false} />
                                <Tooltip 
                                    contentStyle={{ background: '#fff', border: '1px solid #f3f4f6', borderRadius: '12px', color: '#4b5563' }}
                                    formatter={(value: any, name: any) => {
                                        if (name === 'cantidad_asignada') return [value, 'Cantidad Asignada'];
                                        if (name === 'tiempo_minutos') return [`${value} min`, 'Tiempo Invertido'];
                                        return [value, name];
                                    }}
                                    labelFormatter={(label: any) => `Registro: ${label}`}
                                />
                                <Bar yAxisId="left" dataKey="cantidad_asignada" name="cantidad_asignada" fill="#2563eb" radius={[4, 4, 0, 0]} />
                                <Bar yAxisId="right" dataKey="tiempo_minutos" name="tiempo_minutos" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center items-center gap-6 text-xs text-gray-700 pt-3 border-t border-gray-50 mt-4">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-blue-600 rounded-full inline-block"></span>
                            <span>Cantidad Asignada</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span>
                            <span>Tiempo Invertido (minutos)</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}