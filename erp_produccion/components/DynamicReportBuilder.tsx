'use client'

import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Icon } from '@iconify/react'

// MÁS OPCIONES DE TABLAS Y MÉTRICAS
const TABLE_CONFIG: Record<string, { label: string, dimensions: { id: string, label: string }[], metrics: { id: string, label: string }[] }> = {
    usuarios: {
        label: 'Usuarios y Personal',
        dimensions: [{ id: 'area', label: 'Área' }, { id: 'tipo_usuario', label: 'Tipo de Usuario' }],
        metrics: [{ id: 'id', label: 'Cantidad de Personas (Conteo)' }]
    },
    ordenes_produccion: {
        label: 'Órdenes Generales',
        dimensions: [{ id: 'cliente', label: 'Cliente' }, { id: 'prioridad', label: 'Prioridad' }, { id: 'producto', label: 'Producto' }],
        metrics: [{ id: 'cantidad', label: 'Piezas Solicitadas (Suma)' }, { id: 'id', label: 'Total de Órdenes (Conteo)' }]
    },
    admin_costura_ordenes: {
        label: 'Órdenes de Costura',
        dimensions: [{ id: 'cliente', label: 'Cliente' }, { id: 'prioridad', label: 'Prioridad' }, { id: 'producto', label: 'Producto' }],
        metrics: [{ id: 'cantidad', label: 'Piezas Solicitadas (Suma)' }, { id: 'id', label: 'Total de Órdenes (Conteo)' }]
    },
    admin_costura_asignaciones: {
        label: 'Asignaciones a Operadores',
        dimensions: [{ id: 'nombre_operador', label: 'Operador' }, { id: 'producto', label: 'Producto' }, { id: 'estatus', label: 'Estatus' }],
        metrics: [{ id: 'cantidad_asignada', label: 'Piezas Asignadas (Suma)' }, { id: 'id', label: 'Veces Asignado (Conteo)' }]
    },
    operador_tiempos_costura: {
        label: 'Tiempos de Costura',
        dimensions: [{ id: 'id_operador', label: 'ID Operador' }, { id: 'producto', label: 'Producto' }],
        metrics: [{ id: 'cantidad_asignada', label: 'Piezas Procesadas (Suma)' }, { id: 'id', label: 'Registros (Conteo)' }]
    },
    admin_costura_cortes: {
        label: 'Historial de Cortes',
        dimensions: [{ id: 'estatus', label: 'Estatus' }, { id: 'producto', label: 'Producto' }],
        metrics: [{ id: 'cantidad', label: 'Piezas Cortadas (Suma)' }]
    },
    productos_tiempos: {
        label: 'Catálogo de Productos',
        dimensions: [{ id: 'modelo', label: 'Modelo' }, { id: 'costura', label: 'Tipo de Costura' }],
        metrics: [{ id: 'id', label: 'Cantidad de Productos (Conteo)' }]
    },
    admin_costura_papelera: {
        label: 'Órdenes Canceladas (Papelera)',
        dimensions: [{ id: 'motivo', label: 'Motivo de Cancelación' }, { id: 'cliente', label: 'Cliente' }, { id: 'producto', label: 'Producto' }],
        metrics: [{ id: 'cantidad', label: 'Piezas Canceladas (Suma)' }, { id: 'id', label: 'Órdenes Canceladas (Conteo)' }]
    }
}

const COLORS = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#64748b', '#f43f5e']

export default function DynamicReportBuilder() {
    const [selectedTable, setSelectedTable] = useState('ordenes_produccion')
    const [selectedX, setSelectedX] = useState('cliente')
    const [selectedY, setSelectedY] = useState('cantidad')
    const [chartType, setChartType] = useState<'bar' | 'pie' | 'line'>('bar')

    const [chartData, setChartData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const handleGenerate = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/reportes/dinamicos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tabla: selectedTable, dimensionX: selectedX, metricaY: selectedY })
            })
            const data = await res.json()
            if (data.success) {
                // FIX PARA PIE CHART: Forzamos que value sea un número estricto
                const parsedData = data.data.map((item: any) => ({
                    label: String(item.label),
                    value: Number(item.value)
                }))
                setChartData(parsedData)
            } else {
                alert(data.message)
            }
        } catch (error) {
            console.error("Error al generar gráfica:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const table = e.target.value
        setSelectedTable(table)
        setSelectedX(TABLE_CONFIG[table].dimensions[0].id)
        setSelectedY(TABLE_CONFIG[table].metrics[0].id)
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 w-full">
            <div className="mb-6 border-b border-gray-100 pb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Icon icon="lucide:bar-chart-3" className="text-blue-600" />
                    Generador de Gráficas Dinámicas
                </h2>
                <p className="text-sm text-gray-700 mt-1">Selecciona el origen de datos y las variables para construir tu gráfica.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Base de Datos (Tabla)</label>
                    <select
                        className="w-full text-sm font-medium text-gray-900 border-gray-300 rounded-lg bg-gray-50 p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={selectedTable}
                        onChange={handleTableChange}
                    >
                        {Object.entries(TABLE_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Eje X (Agrupar por)</label>
                    <select
                        className="w-full text-sm font-medium text-gray-900 border-gray-300 rounded-lg bg-gray-50 p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedX}
                        onChange={(e) => setSelectedX(e.target.value)}
                    >
                        {TABLE_CONFIG[selectedTable].dimensions.map(dim => (
                            <option key={dim.id} value={dim.id}>{dim.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-900 mb-1">Eje Y (Calcular)</label>
                    <select
                        className="w-full text-sm font-medium text-gray-900 border-gray-300 rounded-lg bg-gray-50 p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedY}
                        onChange={(e) => setSelectedY(e.target.value)}
                    >
                        {TABLE_CONFIG[selectedTable].metrics.map(met => (
                            <option key={met.id} value={met.id}>{met.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-900 mb-1">Tipo</label>
                        <select
                            className="w-full text-sm font-medium text-gray-900 border-gray-300 rounded-lg bg-gray-50 p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                            value={chartType}
                            onChange={(e: any) => setChartType(e.target.value)}
                        >
                            <option value="bar">Barras</option>
                            <option value="line">Líneas</option>
                            <option value="pie">Pastel / Donut</option>
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="h-[42px] px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                        {loading ? <Icon icon="lucide:loader-2" className="animate-spin text-lg" /> : 'Generar'}
                    </button>
                </div>
            </div>

            {/* Área de la Gráfica */}
            <div className="h-96 w-full bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-center justify-center shadow-inner">
                {chartData.length === 0 ? (
                    <div className="text-gray-500 font-medium text-sm flex flex-col items-center gap-2">
                        <Icon icon="lucide:pie-chart" className="text-4xl opacity-70 text-gray-600" />
                        <p>Haz clic en "Generar" para ver los resultados</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' ? (
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="label" stroke="#374151" fontSize={12} tickLine={false} angle={-25} textAnchor="end" />
                                <YAxis stroke="#374151" fontSize={12} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        ) : chartType === 'line' ? (
                            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="label" stroke="#374151" fontSize={12} tickLine={false} angle={-25} textAnchor="end" />
                                <YAxis stroke="#374151" fontSize={12} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} />
                            </LineChart>
                        ) : (
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="label"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={110}
                                    paddingAngle={2}
                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        )}
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}