'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from 'recharts'
import { Icon } from '@iconify/react'

const BI_COLORS = ['#118DFF', '#12239E', '#E66C37', '#6B007B', '#E044A7', '#744EC2', '#D9B300', '#D64550']

const formatearNombreTabla = (nombre: string) => {
    return nombre
        .replace('admin_costura_', '')
        .replace('ordenes_', 'Órdenes ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

export default function DynamicReportBuilder() {
    const [esquemaBD, setEsquemaBD] = useState<any>(null)
    const [temaSeleccionado, setTemaSeleccionado] = useState('')
    
    const [ejeX, setEjeX] = useState<{ id: string, label: string } | null>(null)
    const [ejeY, setEjeY] = useState<{ id: string, label: string }[]>([]) 
    
    const [tipoGrafica, setTipoGrafica] = useState<'bar' | 'line' | 'area' | 'pie'>('bar')
    const [datosGrafica, setDatosGrafica] = useState<any[]>([])
    const [cargando, setCargando] = useState(false)

    const [dragOverX, setDragOverX] = useState(false)
    const [dragOverY, setDragOverY] = useState(false)

    useEffect(() => {
        async function cargarEsquema() {
            try {
                const res = await fetch('/api/reportes/esquema')
                const data = await res.json()
                if (data.success) {
                    setEsquemaBD(data.esquema)
                    setTemaSeleccionado(Object.keys(data.esquema)[0])
                }
            } catch (error) {
                console.error("Error cargando el motor BI:", error)
            }
        }
        cargarEsquema()
    }, [])

    const cambiarTema = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTemaSeleccionado(e.target.value)
        setEjeX(null)
        setEjeY([])
        setDatosGrafica([])
    }

    const iniciarArrastre = (e: React.DragEvent, item: { id: string, label: string }, tipo: 'dimension' | 'metrica') => {
        e.dataTransfer.setData('application/json', JSON.stringify({ ...item, tipo }))
    }

    const soltarEnX = (e: React.DragEvent) => {
        e.preventDefault(); setDragOverX(false)
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'))
            if (data.tipo === 'dimension') setEjeX({ id: data.id, label: data.label })
        } catch {}
    }

    const soltarEnY = (e: React.DragEvent) => {
        e.preventDefault(); setDragOverY(false)
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'))
            if (data.tipo === 'metrica') {
                if (!ejeY.find(m => m.id === data.id)) {
                    setEjeY([...ejeY, { id: data.id, label: data.label }])
                }
            }
        } catch {}
    }

    const removerMetricaY = (id: string) => {
        setEjeY(ejeY.filter(m => m.id !== id))
    }

    const generarResultados = async () => {
        if (!ejeX || ejeY.length === 0) return

        setCargando(true)
        try {
            const res = await fetch('/api/reportes/dinamicos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tabla: temaSeleccionado, 
                    dimensionX: ejeX.id, 
                    metricasY: ejeY.map(m => m.id) 
                })
            })
            const data = await res.json()
            if (data.success) {
                const procesados = data.data.map((item: any) => {
                    let obj: any = { label: String(item.label) }
                    ejeY.forEach(m => { obj[m.id] = Number(item[m.id]) || 0 })
                    return obj
                })
                setDatosGrafica(procesados)
            } else {
                alert(data.message)
            }
        } catch (error) {
            console.error("Error al generar gráfica:", error)
        } finally {
            setCargando(false)
        }
    }

    if (!esquemaBD) {
        return (
            <div className="flex h-96 items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-500 gap-3">
                <Icon icon="lucide:loader-2" className="animate-spin text-2xl text-blue-500" />
                Iniciando motor de Inteligencia de Negocios...
            </div>
        )
    }

    const config = esquemaBD[temaSeleccionado]

    // Estilo común para todos los Tooltips (Letras en Gris Fuerte)
    const estiloTooltip = {
        content: { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
        item: { color: '#374151', fontWeight: 600 }, // Gris Fuerte
        label: { color: '#111827', fontWeight: 800, paddingBottom: '4px' } // Gris Casi Negro para el título
    }

    return (
        <div className="flex h-[700px] bg-[#f3f2f1] border border-gray-300 rounded-lg overflow-hidden shadow-sm font-sans">
            
            {/* 1. LIENZO PRINCIPAL (Izquierda) */}
            <div className="flex-1 bg-white m-2 shadow-sm rounded-md border border-gray-200 flex flex-col relative overflow-hidden">
                <div className="h-12 border-b border-gray-100 flex items-center px-4 justify-between bg-gray-50/50">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Icon icon="lucide:presentation" className="text-blue-600" /> Lienzo de Reporte
                    </h3>
                    <button 
                        onClick={generarResultados}
                        disabled={cargando || !ejeX || ejeY.length === 0}
                        className="px-4 py-1.5 bg-[#F2C811] hover:bg-[#d9b300] text-black font-semibold text-xs rounded-sm shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {cargando ? <Icon icon="lucide:loader-2" className="animate-spin" /> : <Icon icon="lucide:refresh-cw" />}
                        Actualizar Datos
                    </button>
                </div>
                
                <div className="flex-1 p-6 flex items-center justify-center">
                    {datosGrafica.length === 0 ? (
                        <div className="text-gray-400 flex flex-col items-center">
                            <Icon icon="lucide:bar-chart-big" className="text-6xl mb-3 opacity-20" />
                            <p className="text-sm">Agregue datos a los campos visuales para crear el gráfico.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            {tipoGrafica === 'bar' ? (
                                <BarChart data={datosGrafica} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                    <XAxis dataKey="label" stroke="#605E5C" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#605E5C" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={estiloTooltip.content} itemStyle={estiloTooltip.item} labelStyle={estiloTooltip.label} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                                    {ejeY.map((m, i) => (
                                        <Bar key={m.id} dataKey={m.id} name={m.label} fill={BI_COLORS[i % BI_COLORS.length]} radius={[2, 2, 0, 0]} />
                                    ))}
                                </BarChart>
                            ) : tipoGrafica === 'line' ? (
                                <LineChart data={datosGrafica} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                    <XAxis dataKey="label" stroke="#605E5C" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#605E5C" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={estiloTooltip.content} itemStyle={estiloTooltip.item} labelStyle={estiloTooltip.label} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                                    {ejeY.map((m, i) => (
                                        <Line key={m.id} type="monotone" dataKey={m.id} name={m.label} stroke={BI_COLORS[i % BI_COLORS.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    ))}
                                </LineChart>
                            ) : tipoGrafica === 'area' ? (
                                <AreaChart data={datosGrafica} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                    <XAxis dataKey="label" stroke="#605E5C" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#605E5C" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={estiloTooltip.content} itemStyle={estiloTooltip.item} labelStyle={estiloTooltip.label} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                                    {ejeY.map((m, i) => (
                                        <Area key={m.id} type="monotone" dataKey={m.id} name={m.label} fill={BI_COLORS[i % BI_COLORS.length]} stroke={BI_COLORS[i % BI_COLORS.length]} fillOpacity={0.3} />
                                    ))}
                                </AreaChart>
                            ) : (
                                <PieChart>
                                    <Pie
                                        data={datosGrafica}
                                        dataKey={ejeY[0]?.id || "value"}
                                        nameKey="label"
                                        cx="50%" cy="50%"
                                        innerRadius={80} outerRadius={120}
                                        paddingAngle={2}
                                        label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(1)}%)`}
                                        labelLine={false}
                                    >
                                        {datosGrafica.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={BI_COLORS[index % BI_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={estiloTooltip.content} itemStyle={estiloTooltip.item} labelStyle={estiloTooltip.label} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            )}
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* 2. PANEL DE VISUALIZACIONES (Centro) */}
            <div className="w-64 bg-white border-l border-gray-200 flex flex-col z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">
                <div className="h-10 flex items-center px-4 border-b border-gray-200 bg-gray-50/50">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Visualizaciones</span>
                </div>
                
                <div className="p-4 border-b border-gray-200">
                    <div className="grid grid-cols-4 gap-2">
                        <button onClick={() => setTipoGrafica('bar')} className={`aspect-square flex items-center justify-center border rounded hover:bg-gray-50 ${tipoGrafica === 'bar' ? 'border-[#F2C811] bg-yellow-50/30 text-black' : 'border-gray-200 text-gray-500'}`} title="Gráfico de columnas">
                            <Icon icon="lucide:bar-chart-3" className="text-xl" />
                        </button>
                        <button onClick={() => setTipoGrafica('line')} className={`aspect-square flex items-center justify-center border rounded hover:bg-gray-50 ${tipoGrafica === 'line' ? 'border-[#F2C811] bg-yellow-50/30 text-black' : 'border-gray-200 text-gray-500'}`} title="Gráfico de líneas">
                            <Icon icon="lucide:line-chart" className="text-xl" />
                        </button>
                        <button onClick={() => setTipoGrafica('area')} className={`aspect-square flex items-center justify-center border rounded hover:bg-gray-50 ${tipoGrafica === 'area' ? 'border-[#F2C811] bg-yellow-50/30 text-black' : 'border-gray-200 text-gray-500'}`} title="Gráfico de áreas">
                            <Icon icon="lucide:area-chart" className="text-xl" />
                        </button>
                        <button onClick={() => setTipoGrafica('pie')} className={`aspect-square flex items-center justify-center border rounded hover:bg-gray-50 ${tipoGrafica === 'pie' ? 'border-[#F2C811] bg-yellow-50/30 text-black' : 'border-gray-200 text-gray-500'}`} title="Gráfico circular">
                            <Icon icon="lucide:pie-chart" className="text-xl" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
                    <div>
                        <span className="text-[11px] font-semibold text-gray-600 mb-1.5 block">Eje X (Categoría)</span>
                        <div 
                            onDrop={soltarEnX}
                            onDragOver={(e) => { e.preventDefault(); setDragOverX(true) }}
                            onDragLeave={() => setDragOverX(false)}
                            className={`min-h-[36px] w-full border border-gray-300 bg-white rounded flex items-center px-2 py-1 transition-colors ${dragOverX ? 'border-blue-400 bg-blue-50' : ''}`}
                        >
                            {ejeX ? (
                                <div className="bg-gray-100 border border-gray-200 text-gray-700 text-xs px-2 py-1 flex items-center justify-between w-full rounded-sm">
                                    <span className="truncate mr-2">{ejeX.label}</span>
                                    <button onClick={() => setEjeX(null)} className="hover:text-red-500"><Icon icon="lucide:x" /></button>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-400 italic">Arrastre campos aquí</span>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[11px] font-semibold text-gray-600 block">Eje Y (Valores)</span>
                            {ejeY.length > 0 && <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 rounded">{ejeY.length}</span>}
                        </div>
                        <div 
                            onDrop={soltarEnY}
                            onDragOver={(e) => { e.preventDefault(); setDragOverY(true) }}
                            onDragLeave={() => setDragOverY(false)}
                            className={`min-h-[70px] w-full border border-gray-300 bg-white rounded flex flex-col gap-1 px-2 py-1.5 transition-colors ${dragOverY ? 'border-emerald-400 bg-emerald-50' : ''}`}
                        >
                            {ejeY.length > 0 ? (
                                ejeY.map((metrica, i) => (
                                    <div key={metrica.id} className="bg-gray-100 border border-gray-200 text-gray-700 text-xs px-2 py-1 flex items-center justify-between w-full rounded-sm border-l-4" style={{borderLeftColor: BI_COLORS[i % BI_COLORS.length]}}>
                                        <span className="truncate mr-2">{metrica.label}</span>
                                        <button onClick={() => removerMetricaY(metrica.id)} className="hover:text-red-500"><Icon icon="lucide:x" /></button>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                    <span className="text-xs text-gray-400 italic text-center">Arrastre valores aquí</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. PANEL DE DATOS (Derecha) */}
            <div className="w-64 bg-white border-l border-gray-200 flex flex-col z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.02)]">
                <div className="h-10 flex items-center px-4 border-b border-gray-200 bg-gray-50/50">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Datos</span>
                </div>
                
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <select
                        className="w-full text-xs font-semibold text-gray-800 border-gray-300 rounded shadow-sm bg-white p-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                        value={temaSeleccionado}
                        onChange={cambiarTema}
                    >
                        {Object.keys(esquemaBD).map((key) => (
                            <option key={key} value={key}>{formatearNombreTabla(key)}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto py-2">
                    <div className="px-3 py-1 mt-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Categorías</span>
                        <div className="flex flex-col gap-0.5">
                            {config.dimensiones.map((dim: any) => (
                                <div 
                                    key={dim.id} draggable onDragStart={(e) => iniciarArrastre(e, dim, 'dimension')}
                                    className="px-2 py-1.5 hover:bg-gray-100 text-xs text-gray-700 cursor-grab flex items-center gap-2 rounded-sm border border-transparent hover:border-gray-200 transition-colors"
                                >
                                    <Icon icon="lucide:text" className="text-gray-400 text-sm" />
                                    {dim.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="my-2 border-t border-gray-100 mx-4"></div>

                    <div className="px-3 py-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Valores Matemáticos</span>
                        <div className="flex flex-col gap-0.5">
                            {config.metricas.map((met: any) => (
                                <div 
                                    key={met.id} draggable onDragStart={(e) => iniciarArrastre(e, met, 'metrica')}
                                    className="px-2 py-1.5 hover:bg-gray-100 text-xs text-gray-700 cursor-grab flex items-center gap-2 rounded-sm border border-transparent hover:border-gray-200 transition-colors"
                                >
                                    <Icon icon="lucide:sigma" className="text-[#F2C811] text-sm" />
                                    {met.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}