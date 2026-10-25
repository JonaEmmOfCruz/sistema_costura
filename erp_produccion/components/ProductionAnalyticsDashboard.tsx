'use client'

import { Icon } from "@iconify/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import useRealtimeRefresh from "@/lib/useRealtimeRefresh"
import SewingLoader from "@/components/SewingLoader"

interface OperatorMetric {
    nombre: string
    ordenesTerminadas: number
    piezas: number
    minutosTrabajados: number
    minutosEstimados: number | null
    minutosPorPieza: number
    cumplimientoSugerido: number | null
}

interface TrendMetric {
    fecha: string
    piezasCostura: number
    piezasCorte: number
}

interface ProductionAnalytics {
    success: boolean
    message?: string
    period: { desde: string; hasta: string } | null
    generatedAt: string
    trendPeriod: { desde: string; hasta: string }
    sewing: {
        ordenesTerminadas: number
        piezas: number
        minutosTrabajados: number
        minutosPorPieza: number
        cumplimientoSugerido: number | null
    }
    operators: OperatorMetric[]
    cutting: {
        ordenesTerminadas: number
        piezasTerminadas: number
        minutosPromedioPorOrden: number
        enProceso: number
        porAsignar: number
        cortadas: number
        otras: number
        piezasEnProceso: number
        piezasPorAsignar: number
        piezasCortadas: number
        ordenesEnEspera: number
        ordenesVencidas: number
    }
    assignments: {
        operadoresActivos: number
        asignacionesActivas: number
        piezasAsignadas: number
    }
    trend: TrendMetric[]
}

interface DateRange {
    from: string
    to: string
}

const CUT_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#94a3b8']
const numberFormat = new Intl.NumberFormat('es-MX')

function formatMinutes(totalMinutes: number) {
    const safeMinutes = Math.max(0, Math.round(totalMinutes))
    const hours = Math.floor(safeMinutes / 60)
    const minutes = safeMinutes % 60
    return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`
}

function formatDate(date: string) {
    return new Date(`${date}T00:00:00`).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
    })
}

function getDateOffset(daysAgo: number) {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    return date.toISOString().slice(0, 10)
}

function MetricCard({
    title,
    value,
    detail,
    icon,
    accent,
}: {
    title: string
    value: string
    detail: string
    icon: string
    accent: string
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
                    <Icon icon={icon} className="text-xl" />
                </span>
            </div>
        </article>
    )
}

export default function ProductionAnalyticsDashboard() {
    const [dateMode, setDateMode] = useState(false)
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [appliedRange, setAppliedRange] = useState<DateRange | null>(null)
    const [analytics, setAnalytics] = useState<ProductionAnalytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const requestVersion = useRef(0)

    const queryUrl = useMemo(() => {
        if (!appliedRange) return '/api/admin/analisis'
        const query = new URLSearchParams({ desde: appliedRange.from, hasta: appliedRange.to })
        return `/api/admin/analisis?${query.toString()}`
    }, [appliedRange])

    const loadAnalytics = useCallback(async () => {
        const currentRequest = ++requestVersion.current
        try {
            const response = await fetch(queryUrl, { cache: 'no-store' })
            const payload = await response.json() as ProductionAnalytics
            if (!response.ok || !payload.success) {
                throw new Error(payload.message || 'No se pudo cargar el análisis')
            }
            if (currentRequest !== requestVersion.current) return
            setAnalytics(payload)
            setError('')
        } catch (cause) {
            if (currentRequest !== requestVersion.current) return
            console.error('Error al cargar el análisis de producción:', cause)
            setError(cause instanceof Error ? cause.message : 'No se pudo cargar el análisis de producción')
        } finally {
            if (currentRequest === requestVersion.current) setLoading(false)
        }
    }, [queryUrl])

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadAnalytics()
        }, 0)
        return () => window.clearTimeout(timer)
    }, [loadAnalytics])

    useRealtimeRefresh(loadAnalytics)

    function applyPreset(days: number) {
        const range = { from: getDateOffset(days - 1), to: new Date().toISOString().slice(0, 10) }
        setDateFrom(range.from)
        setDateTo(range.to)
        setLoading(true)
        setError('')
        setAppliedRange(range)
        setDateMode(true)
    }

    function applyDateRange(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!dateFrom || !dateTo) {
            setError('Selecciona las fechas inicial y final para consultar el periodo.')
            return
        }
        if (dateFrom > dateTo) {
            setError('La fecha inicial no puede ser posterior a la fecha final.')
            return
        }
        const days = (Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) / 86_400_000
        if (days > 366) {
            setError('El periodo máximo de consulta es de 366 días.')
            return
        }
        setError('')
        setLoading(true)
        setAppliedRange({ from: dateFrom, to: dateTo })
    }

    function showGeneral() {
        setDateMode(false)
        setLoading(true)
        setAppliedRange(null)
        setError('')
    }

    const cuttingStages = analytics ? [
        { name: 'En proceso', value: analytics.cutting.enProceso },
        { name: 'Por asignar', value: analytics.cutting.porAsignar },
        { name: 'Cortadas', value: analytics.cutting.cortadas },
        { name: 'Otros', value: analytics.cutting.otras },
    ].filter(stage => stage.value > 0) : []
    const timeComparison = analytics?.operators.filter(operator => operator.minutosEstimados !== null) ?? []

    const insights = useMemo(() => {
        if (!analytics) return []
        const items: { icon: string; title: string; message: string; tone: string }[] = []
        const compliance = analytics.sewing.cumplimientoSugerido

        if (compliance === null) {
            items.push({
                icon: 'lucide:timer',
                title: 'Comparación de tiempos',
                message: 'Aún no hay suficientes tiempos estándar de producto para comparar la duración real de costura.',
                tone: 'text-blue-700 bg-blue-50',
            })
        } else if (compliance >= 100) {
            items.push({
                icon: 'lucide:trending-up',
                title: 'Costura frente al tiempo sugerido',
                message: `El tiempo real equivale al ${Math.round(10000 / compliance) / 100}% del tiempo sugerido en los productos con estándar registrado.`,
                tone: 'text-emerald-700 bg-emerald-50',
            })
        } else {
            const excess = Math.round((10000 / compliance - 100) * 10) / 10
            items.push({
                icon: 'lucide:clock-3',
                title: 'Costura frente al tiempo sugerido',
                message: `El tiempo real está ${excess}% por encima del estándar en los productos comparables.`,
                tone: 'text-amber-700 bg-amber-50',
            })
        }

        const leadingOperator = [...analytics.operators].sort((a, b) => b.piezas - a.piezas)[0]
        if (leadingOperator) {
            items.push({
                icon: 'lucide:users-round',
                title: 'Mayor volumen de costura',
                message: `${leadingOperator.nombre} terminó ${numberFormat.format(leadingOperator.piezas)} piezas en el periodo analizado.`,
                tone: 'text-indigo-700 bg-indigo-50',
            })
        }
        if (analytics.cutting.ordenesVencidas > 0) {
            items.push({
                icon: 'lucide:triangle-alert',
                title: 'Órdenes vencidas pendientes',
                message: `Hay ${numberFormat.format(analytics.cutting.ordenesVencidas)} órdenes con fecha de entrega vencida que aún no aparecen como cortadas.`,
                tone: 'text-red-700 bg-red-50',
            })
        } else {
            items.push({
                icon: 'lucide:circle-check',
                title: 'Fechas de entrega',
                message: 'No hay órdenes vencidas pendientes de corte en este momento.',
                tone: 'text-emerald-700 bg-emerald-50',
            })
        }
        return items
    }, [analytics])

    const periodLabel = appliedRange
        ? `${formatDate(appliedRange.from)} – ${formatDate(appliedRange.to)}`
        : 'Histórico general'

    return (
        <section className="mt-8 space-y-6">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Icon icon="lucide:chart-no-axes-combined" className="text-2xl" />
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Análisis de producción</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Costura, rendimiento por operador y avance de corte · {periodLabel}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        aria-pressed={!dateMode}
                        onClick={showGeneral}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${!dateMode ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        General
                    </button>
                    <button
                        type="button"
                        aria-pressed={dateMode}
                        onClick={() => setDateMode(true)}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${dateMode ? 'bg-slate-800 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        Por fechas
                    </button>
                </div>
            </header>

            {dateMode && (
                <form onSubmit={applyDateRange} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-end">
                    <label className="grid gap-1 text-xs font-semibold text-slate-500">
                        Desde
                        <input
                            type="date"
                            required
                            value={dateFrom}
                            onChange={event => setDateFrom(event.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-500"
                        />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-slate-500">
                        Hasta
                        <input
                            type="date"
                            required
                            value={dateTo}
                            onChange={event => setDateTo(event.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-500"
                        />
                    </label>
                    <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                        Aplicar periodo
                    </button>
                    <div className="flex flex-wrap gap-2 md:ml-auto">
                        {[7, 30, 90].map(days => (
                            <button
                                key={days}
                                type="button"
                                onClick={() => applyPreset(days)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                {days} días
                            </button>
                        ))}
                    </div>
                </form>
            )}

            {error && (
                <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <Icon icon="lucide:circle-alert" className="text-lg" />
                    {error}
                </div>
            )}

            {loading && !analytics ? (
                <SewingLoader message="Cargando análisis de producción" compact />
            ) : analytics ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            title="Piezas terminadas en costura"
                            value={numberFormat.format(analytics.sewing.piezas)}
                            detail={`${numberFormat.format(analytics.sewing.ordenesTerminadas)} operaciones terminadas`}
                            icon="lucide:shrub"
                            accent="bg-blue-50 text-blue-700"
                        />
                        <MetricCard
                            title="Tiempo trabajado en costura"
                            value={formatMinutes(analytics.sewing.minutosTrabajados)}
                            detail={analytics.sewing.piezas > 0
                                ? `${analytics.sewing.minutosPorPieza.toFixed(1)} min promedio por pieza`
                                : 'Sin operaciones terminadas'}
                            icon="lucide:timer"
                            accent="bg-violet-50 text-violet-700"
                        />
                        <MetricCard
                            title="Cumplimiento de tiempo sugerido"
                            value={analytics.sewing.cumplimientoSugerido === null
                                ? 'Sin datos'
                                : `${Math.round(analytics.sewing.cumplimientoSugerido)}%`}
                            detail="Tiempo sugerido ÷ tiempo real, en registros con estándar"
                            icon="lucide:target"
                            accent="bg-emerald-50 text-emerald-700"
                        />
                        <MetricCard
                            title="Piezas terminadas en corte"
                            value={numberFormat.format(analytics.cutting.piezasTerminadas)}
                            detail={`${numberFormat.format(analytics.cutting.ordenesTerminadas)} órdenes cortadas en el periodo`}
                            icon="lucide:scissors"
                            accent="bg-amber-50 text-amber-700"
                        />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-3">
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                            <div className="mb-4">
                                <h3 className="font-semibold text-slate-800">Piezas terminadas por día</h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    {appliedRange ? 'Actividad dentro del periodo seleccionado.' : `Tendencia reciente: ${formatDate(analytics.trendPeriod.desde)} – ${formatDate(analytics.trendPeriod.hasta)}.`}
                                </p>
                            </div>
                            {analytics.trend.length > 0 ? (
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={analytics.trend} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                                            <CartesianGrid stroke="#e2e8f0" vertical={false} />
                                            <XAxis dataKey="fecha" tickFormatter={formatDate} tickLine={false} axisLine={false} fontSize={11} />
                                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                                            <Tooltip
                                                labelFormatter={label => formatDate(String(label))}
                                                formatter={(value, name) => [numberFormat.format(Number(value)), name === 'piezasCostura' ? 'Costura' : 'Corte']}
                                                contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 12 }}
                                            />
                                            <Legend formatter={value => value === 'piezasCostura' ? 'Costura' : 'Corte'} />
                                            <Line type="monotone" dataKey="piezasCostura" name="piezasCostura" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                            <Line type="monotone" dataKey="piezasCorte" name="piezasCorte" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex h-72 items-center justify-center text-sm text-slate-400">
                                    No hay operaciones terminadas en este periodo.
                                </div>
                            )}
                        </article>

                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-2">
                                <h3 className="font-semibold text-slate-800">Estado actual del corte</h3>
                                <p className="mt-1 text-xs text-slate-500">Órdenes y piezas por etapa, sin filtro de fechas.</p>
                            </div>
                            {cuttingStages.length > 0 ? (
                                <>
                                    <div className="h-52">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={cuttingStages} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={3}>
                                                    {cuttingStages.map((stage, index) => (
                                                        <Cell key={stage.name} fill={CUT_COLORS[index % CUT_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={value => [numberFormat.format(Number(value)), 'Órdenes']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2">
                                        {cuttingStages.map((stage, index) => (
                                            <div key={stage.name} className="flex items-center justify-between text-xs">
                                                <span className="flex items-center gap-2 text-slate-600">
                                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CUT_COLORS[index % CUT_COLORS.length] }} />
                                                    {stage.name}
                                                </span>
                                                <span className="font-semibold tabular-nums text-slate-800">{numberFormat.format(stage.value)} órdenes</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                                    No hay órdenes registradas en corte.
                                </div>
                            )}
                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                                <div className="rounded-lg bg-amber-50 p-3">
                                    <p className="text-[11px] text-amber-700">Órdenes en espera</p>
                                    <p className="mt-1 text-lg font-bold text-amber-900">{numberFormat.format(analytics.cutting.ordenesEnEspera)}</p>
                                </div>
                                <div className="rounded-lg bg-red-50 p-3">
                                    <p className="text-[11px] text-red-700">Entregas vencidas</p>
                                    <p className="mt-1 text-lg font-bold text-red-900">{numberFormat.format(analytics.cutting.ordenesVencidas)}</p>
                                </div>
                            </div>
                        </article>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-5">
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
                            <div className="mb-4">
                                <h3 className="font-semibold text-slate-800">Producción terminada por operador</h3>
                                <p className="mt-1 text-xs text-slate-500">Volumen de piezas; no es una clasificación de calidad ni considera la complejidad del producto.</p>
                            </div>
                            {analytics.operators.length > 0 ? (
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.operators.slice(0, 8)} layout="vertical" margin={{ top: 2, right: 18, left: 12, bottom: 2 }}>
                                            <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                                            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                                            <YAxis type="category" dataKey="nombre" width={110} tickLine={false} axisLine={false} fontSize={11} />
                                            <Tooltip formatter={value => [numberFormat.format(Number(value)), 'Piezas']} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 12 }} />
                                            <Bar dataKey="piezas" fill="#2563eb" radius={[0, 6, 6, 0]} maxBarSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="flex h-80 items-center justify-center text-sm text-slate-400">
                                    No hay operaciones de costura terminadas en este periodo.
                                </div>
                            )}
                        </article>

                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                            <h3 className="font-semibold text-slate-800">Lecturas para el análisis</h3>
                            <div className="mt-4 space-y-3">
                                {insights.map(item => (
                                    <div key={item.title} className={`flex gap-3 rounded-xl p-3 ${item.tone}`}>
                                        <Icon icon={item.icon} className="mt-0.5 shrink-0 text-lg" />
                                        <div>
                                            <p className="text-sm font-semibold">{item.title}</p>
                                            <p className="mt-1 text-xs leading-5 opacity-90">{item.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    </div>

                    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4">
                            <h3 className="font-semibold text-slate-800">Tiempo real vs. tiempo estimado por operador</h3>
                            <p className="mt-1 text-xs text-slate-500">
                                Compara los minutos reales registrados contra el estándar del producto multiplicado por las piezas terminadas.
                            </p>
                        </div>
                        {timeComparison.length > 0 ? (
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={timeComparison} margin={{ top: 8, right: 18, left: 4, bottom: 2 }}>
                                        <CartesianGrid stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="nombre" tickLine={false} axisLine={false} fontSize={11} />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            fontSize={11}
                                            tickFormatter={value => numberFormat.format(Number(value))}
                                            label={{ value: 'Minutos', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }}
                                        />
                                        <Tooltip
                                            formatter={(value, name) => [formatMinutes(Number(value)), name === 'minutosTrabajados' ? 'Tiempo real' : 'Tiempo estimado']}
                                            contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 12 }}
                                        />
                                        <Legend formatter={value => value === 'minutosTrabajados' ? 'Tiempo real' : 'Tiempo estimado'} />
                                        <Bar dataKey="minutosTrabajados" name="minutosTrabajados" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={30} />
                                        <Bar dataKey="minutosEstimados" name="minutosEstimados" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex h-80 items-center justify-center text-sm text-slate-400">
                                No hay tiempos estándar disponibles para comparar en este periodo.
                            </div>
                        )}
                    </article>

                    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-800">Detalle de costura por operador</h3>
                                <p className="mt-1 text-xs text-slate-500">El cumplimiento compara el tiempo estándar disponible con el tiempo real acumulado.</p>
                            </div>
                            <div className="text-xs text-slate-500">
                                {numberFormat.format(analytics.assignments.operadoresActivos)} operadores con asignación · {numberFormat.format(analytics.assignments.piezasAsignadas)} piezas asignadas actualmente
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Operador</th>
                                        <th className="px-5 py-3 text-right font-semibold">OP terminadas</th>
                                        <th className="px-5 py-3 text-right font-semibold">Piezas</th>
                                        <th className="px-5 py-3 text-right font-semibold">Tiempo trabajado</th>
                                        <th className="px-5 py-3 text-right font-semibold">Tiempo estimado</th>
                                        <th className="px-5 py-3 text-right font-semibold">Min/pieza</th>
                                        <th className="px-5 py-3 text-right font-semibold">Vs. sugerido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {analytics.operators.length > 0 ? analytics.operators.map(operator => (
                                        <tr key={operator.nombre} className="hover:bg-slate-50/70">
                                            <td className="px-5 py-3 font-medium text-slate-800">{operator.nombre}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-slate-600">{numberFormat.format(operator.ordenesTerminadas)}</td>
                                            <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-800">{numberFormat.format(operator.piezas)}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-slate-600">{formatMinutes(operator.minutosTrabajados)}</td>
                                            <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                                                {operator.minutosEstimados === null ? 'Sin estándar' : formatMinutes(operator.minutosEstimados)}
                                            </td>
                                            <td className="px-5 py-3 text-right tabular-nums text-slate-600">{operator.minutosPorPieza.toFixed(1)}</td>
                                            <td className="px-5 py-3 text-right">
                                                {operator.cumplimientoSugerido === null
                                                    ? <span className="text-xs text-slate-400">Sin estándar</span>
                                                    : <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${operator.cumplimientoSugerido >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                        {Math.round(operator.cumplimientoSugerido)}%
                                                    </span>}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} className="px-5 py-8 text-center text-sm text-slate-400">
                                                Sin registros terminados en el periodo.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </article>
                    <p className="text-right text-[11px] text-slate-400">
                        Actualizado {new Date(analytics.generatedAt).toLocaleString('es-MX')} · Las etapas de corte y los vencimientos muestran el estado actual.
                    </p>
                </>
            ) : null}
        </section>
    )
}
