'use client'

import { useState } from "react"
import { Icon } from "@iconify/react"
import ReusableTable from "@/components/ReusableTable"
import useRealtimeRefresh from "@/lib/useRealtimeRefresh"
import SewingLoader from "@/components/SewingLoader"
import usePaginatedApi from "@/lib/usePaginatedApi"

export default function SubirOrdenesPage() {
    const [file, setFile] = useState<File | null>(null)
    const [subiendoArchivo, setSubiendoArchivo] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    
    // Órdenes para la tabla principal
    const { data: ordenes, loading: loadingOrdenes, loadingMore: cargandoMasOrdenes, hasMore: hayMasOrdenes, loadMore: cargarMasOrdenes, reload: cargarOrdenesPrincipales } = usePaginatedApi<any>('/api/admin_costura/ordenes?dataset=ordenes', 'ordenes')

    // Estados para el Modal y las 3 tablas de Costura
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'asignaciones' | 'cortes' | 'tiempos'>('asignaciones')
    
    const asignacionesPagina = usePaginatedApi<any>('/api/costura-asignaciones', 'asignaciones', false)
    const cortesPagina = usePaginatedApi<any>('/api/costura-cortes', 'cortes', false)
    const tiemposPagina = usePaginatedApi<any>('/api/costura-tiempos', 'tiempos', false)
    const [loadingModalData, setLoadingModalData] = useState(false)

    // Estados de filtros de FECHA EXCLUSIVOS por pestaña ({ field: string, date: string } | null)
    const [dateFilterAsignaciones, setDateFilterAsignaciones] = useState<{ field: string; date: string } | null>(null)
    const [dateFilterCortes, setDateFilterCortes] = useState<{ field: string; date: string } | null>(null)
    const [dateFilterTiempos, setDateFilterTiempos] = useState<{ field: string; date: string } | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setStatus(null)
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0])
            setStatus(null)
        }
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setSubiendoArchivo(true)
        setStatus(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/ordenes/subir', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setStatus({ type: 'success', message: data.message })
                setFile(null)
                void cargarOrdenesPrincipales()
            } else {
                setStatus({ type: 'error', message: data.message || 'Error al subir el archivo' })
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Error de conexión con el servidor' })
        } finally {
            setSubiendoArchivo(false)
        }
    }

    // Helpers para datos y formato de fecha (dd/mm/aa hh:mm:ss)
    const renderNullSafe = (value: any) => {
        if (value === null || value === undefined || value === '') return '-'
        return value
    }

    const formatDateSafe = (dateValue: any) => {
        if (!dateValue) return '-'
        const date = new Date(dateValue)
        if (isNaN(date.getTime())) return '-'

        const pad = (n: number) => String(n).padStart(2, '0')

        const day = pad(date.getDate())
        const month = pad(date.getMonth() + 1)
        const year = String(date.getFullYear()).slice(-2)

        const hours = pad(date.getHours())
        const minutes = pad(date.getMinutes())
        const seconds = pad(date.getSeconds())

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
    }

    // Función para formatear fechas a YYYY-MM-DD para comparación con el input date
    const getDateString = (dateValue: any) => {
        if (!dateValue) return ''
        const date = new Date(dateValue)
        if (isNaN(date.getTime())) return ''
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    }

    // Columnas de la tabla principal
    const columns = [
        { header: 'RQ', accessorKey: (row: any) => renderNullSafe(row.rq) },
        { header: 'OP', accessorKey: (row: any) => renderNullSafe(row.op) },
        { header: 'PRODUCTO', accessorKey: (row: any) => renderNullSafe(row.producto) },
        { header: 'NOMBRE', accessorKey: (row: any) => renderNullSafe(row.nombre) },
        { header: 'CANTIDAD', accessorKey: (row: any) => renderNullSafe(row.cantidad) },
    ]

    // Cargar los datos del Modal
    const handleOpenModal = async () => {
        setIsModalOpen(true)
        setLoadingModalData(true)

        try {
            await Promise.all([
                asignacionesPagina.reload(),
                cortesPagina.reload(),
                tiemposPagina.reload(),
            ])
        } catch (error) {
            console.error("Error al cargar datos del modal:", error)
        } finally {
            setLoadingModalData(false)
        }
    }

    useRealtimeRefresh(async () => {
        const refreshes = [cargarOrdenesPrincipales()]
        if (isModalOpen) refreshes.push(handleOpenModal())
        await Promise.all(refreshes)
    })

    // Componente reutilizable para Renderizar el Encabezado con Filtro de Fecha
    const DateHeader = ({ title, fieldKey, currentFilter, setFilter }: { 
        title: string, 
        fieldKey: string, 
        currentFilter: { field: string; date: string } | null, 
        setFilter: (val: { field: string; date: string } | null) => void 
    }) => {
        const isActive = currentFilter?.field === fieldKey
        const activeDate = isActive ? currentFilter.date : ''

        return (
            <div className="flex items-center gap-1.5 justify-between select-none">
                <span className="uppercase text-xs font-bold">{title}</span>
                <div className="relative flex items-center">
                    <button 
                        type="button" 
                        className={`p-1 rounded-md transition-colors hover:bg-gray-200 ${isActive ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-400'}`}
                        title={`Filtrar por ${title}`}
                    >
                        <Icon icon="lucide:calendar" className="text-sm" />
                    </button>
                    <input
                        type="date"
                        value={activeDate}
                        onChange={(e) => {
                            if (e.target.value) {
                                setFilter({ field: fieldKey, date: e.target.value })
                            } else {
                                setFilter(null)
                            }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {isActive && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                setFilter(null)
                            }}
                            className="p-0.5 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                            title="Limpiar filtro de fecha"
                        >
                            <Icon icon="lucide:x" className="text-xs" />
                        </button>
                    )}
                </div>
            </div>
        )
    }

    // Columnas para el Modal con los DateHeader integrados
    const asignacionesColumns = [
        { header: 'RQ', accessorKey: (row: any) => renderNullSafe(row.rq) },
        { header: 'OP', accessorKey: (row: any) => renderNullSafe(row.op) },
        { header: 'Producto', accessorKey: (row: any) => renderNullSafe(row.producto) },
        { header: 'Nombre', accessorKey: (row: any) => renderNullSafe(row.nombre) },
        { header: 'Cant. Asignada', accessorKey: (row: any) => renderNullSafe(row.cantidad_asignada) },
        { header: 'Operador', accessorKey: (row: any) => renderNullSafe(row.nombre_operador) },
        { 
            header: <DateHeader title="Asignado" fieldKey="creado_en" currentFilter={dateFilterAsignaciones} setFilter={setDateFilterAsignaciones} />, 
            accessorKey: (row: any) => formatDateSafe(row.creado_en) 
        },
    ]

    const formatSegundosAHMS = (segundos: number) => {
        if (isNaN(segundos) || segundos < 0) return '-'
        const h = Math.floor(segundos / 3600)
        const m = Math.floor((segundos % 3600) / 60)
        const s = segundos % 60
        
        if (h > 0) return `${h}h ${m}m ${s}s`
        if (m > 0) return `${m}m ${s}s`
        return `${s}s`
    }

    const formatTiempoTranscurrido = (inicio: any, fin: any) => {
        if (!inicio || !fin) return '-'
        const start = new Date(inicio).getTime()
        const end = new Date(fin).getTime()
        if (isNaN(start) || isNaN(end)) return '-'
        
        const diffMs = end - start
        if (diffMs < 0) return '-'
        
        const diffSeg = Math.floor(diffMs / 1000)
        return formatSegundosAHMS(diffSeg)
    }

    // Función que muestra EXCLUSIVAMENTE el tiempo guardado por el temporizador
    const obtenerTiempoCosturaGuardado = (row: any) => {
        const segundosGuardados = Number(row.tiempo_segundos ?? row.tiempo ?? row.segundos)
        if (isNaN(segundosGuardados) || segundosGuardados < 0) return '-'
        return formatSegundosAHMS(segundosGuardados)
    }

    const obtenerObservacionTiempo = (row: any) => {
        const sugerido = Number(row.tiempo_sugerido_segundos)
        if (!Number.isFinite(sugerido) || sugerido <= 0) {
            return (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    Sin métrica
                </span>
            )
        }

        if (!row.fecha_fin || row.tiempo_segundos === null || row.tiempo_segundos === undefined) {
            return (
                <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    En proceso
                </span>
            )
        }

        const diferencia = Number(row.tiempo_segundos) - sugerido
        if (diferencia > 0) {
            return (
                <span className="inline-flex whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                    A destiempo · +{formatSegundosAHMS(diferencia)}
                </span>
            )
        }

        return (
            <span className="inline-flex whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {diferencia < 0 ? `A tiempo · ${formatSegundosAHMS(Math.abs(diferencia))} antes` : 'A tiempo'}
            </span>
        )
    }

    const cortesColumns = [
        { header: 'RQ', accessorKey: (row: any) => renderNullSafe(row.rq) },
        { header: 'OP', accessorKey: (row: any) => renderNullSafe(row.op) },
        { header: 'Producto', accessorKey: (row: any) => renderNullSafe(row.producto) },
        { header: 'Nombre', accessorKey: (row: any) => renderNullSafe(row.nombre) },
        { header: 'Cantidad', accessorKey: (row: any) => renderNullSafe(row.cantidad) },
        { 
            header: <DateHeader title="Inicio" fieldKey="fecha_inicio" currentFilter={dateFilterCortes} setFilter={setDateFilterCortes} />, 
            accessorKey: (row: any) => formatDateSafe(row.fecha_inicio) 
        },
        { 
            header: <DateHeader title="Termino" fieldKey="fecha_fin" currentFilter={dateFilterCortes} setFilter={setDateFilterCortes} />, 
            accessorKey: (row: any) => formatDateSafe(row.fecha_fin) 
        },
        { 
            header: <span className="uppercase text-xs font-bold text-gray-500">Tiempo de Corte</span>, 
            accessorKey: (row: any) => formatTiempoTranscurrido(row.fecha_inicio, row.fecha_fin) 
        },
    ]

    const tiemposColumns = [
        { header: 'RQ', accessorKey: (row: any) => renderNullSafe(row.rq) },
        { header: 'OP', accessorKey: (row: any) => renderNullSafe(row.op) },
        { header: 'Producto', accessorKey: (row: any) => renderNullSafe(row.producto) },
        { header: 'Nombre', accessorKey: (row: any) => renderNullSafe(row.nombre) },
        { header: 'Cant. Asignada', accessorKey: (row: any) => renderNullSafe(row.cantidad_asignada) },
        { header: 'Operador', accessorKey: (row: any) => renderNullSafe(row.nombre_operador) },
        { 
            header: <DateHeader title="Fecha Inicio" fieldKey="fecha_inicio" currentFilter={dateFilterTiempos} setFilter={setDateFilterTiempos} />, 
            accessorKey: (row: any) => formatDateSafe(row.fecha_inicio) 
        },
        { 
            header: <DateHeader title="Fecha Fin" fieldKey="fecha_fin" currentFilter={dateFilterTiempos} setFilter={setDateFilterTiempos} />, 
            accessorKey: (row: any) => formatDateSafe(row.fecha_fin) 
        },
        { 
            header: <span className="uppercase text-xs font-bold text-gray-500">Tiempo de Costura</span>, 
            accessorKey: (row: any) => obtenerTiempoCosturaGuardado(row) 
        },
        {
            header: <span className="uppercase text-xs font-bold text-gray-500">Tiempo sugerido</span>,
            accessorKey: (row: any) => row.tiempo_sugerido_segundos == null
                ? '-'
                : formatSegundosAHMS(Number(row.tiempo_sugerido_segundos))
        },
        {
            header: <span className="uppercase text-xs font-bold text-gray-500">Observación</span>,
            accessorKey: (row: any) => obtenerObservacionTiempo(row)
        },
    ]

    // Función de filtrado por columna de fecha
    const filterData = (items: any[], dateFilter?: { field: string; date: string } | null) => {
        let result = items

        if (dateFilter && dateFilter.field && dateFilter.date) {
            result = result.filter(item => {
                const itemDate = getDateString(item[dateFilter.field])
                return itemDate === dateFilter.date
            })
        }

        return result
    }

    if (loadingOrdenes) return <SewingLoader message="Cargando órdenes" compact />

    return (
        <div className="mx-auto space-y-6">
            <div className="pt-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Carga Órdenes de Producción</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Sube un archivo CSV con las columnas correspondientes para registrar las órdenes de forma masiva.
                    </p>
                </div>

                <button
                    onClick={handleOpenModal}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Icon icon="lucide:scissors" className="text-lg" />
                    <span>Estatus</span>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div onDrop={handleDrop} onDragOver={handleDragOver} className="border-2 border-dashed border-gray-200 hover:border-slate-500 transition-colors rounded-3xl p-10 text-center bg-slate-50 shadow-sm relative cursor-pointer group">
                    <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>

                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-14 h-14 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Icon icon="lucide:file-spreadsheet" className="text-3xl"/>
                        </div>

                        {file ? (
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Archivo listo para cargar</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm font-medium text-gray-700">
                                    Arrastra tu archivo CSV aquí, o <span className="text-slate-600 uppercase">busca en tu equipo</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Formato soportado: .csv</p>
                            </div>
                        )}

                    </div>
                </div>

                {status && (
                    <div className={`p-4 rounded-2xl text-sm flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        <Icon icon={status.type === 'success' ? "lucide:check-circle" : "lucide:alert-circle"} className="text-xl shrink-0" />
                        <span>{status.message}</span>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={!file || subiendoArchivo}
                    className="w-full bg-slate-900 text-white p-3.5 rounded-2xl font-medium hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                    {subiendoArchivo ? (
                        <>
                            <Icon icon="lucide:loader-2" className="text-xl animate-spin" />
                            <span>Procesando archivo...</span>
                        </>
                    ) : (
                        <>
                            <Icon icon="lucide:upload-cloud" className="text-xl" />
                            <span>Importar Órdenes de producción</span>
                        </>
                    )}
                </button>
            </form>

            {/* Tabla Principal */}
            <div className="space-y-3">
                <ReusableTable data={ordenes} columns={columns} searchField='op' searchPlaceholder="Buscar por op..." hasMore={hayMasOrdenes} loadingMore={cargandoMasOrdenes} onLoadMore={cargarMasOrdenes}/>
            </div>

            {/* Modal con 3 pestañas */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                        
                        {/* Cabecera del Modal */}
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">
                                    Módulo de Costura
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Consulta de registros de asignaciones, cortes y tiempos de operadores.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-xl transition-colors"
                            >
                                <Icon icon="lucide:x" className="text-xl" />
                            </button>
                        </div>

                        {/* Pestañas (Tabs) */}
                        <div className="flex border-b border-gray-200 px-6 pt-2 bg-slate-50 gap-4 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab('asignaciones')}
                                className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === 'asignaciones'
                                        ? 'border-slate-800 text-slate-800'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                Asignaciones de costura ({filterData(asignacionesPagina.data, dateFilterAsignaciones).length})
                            </button>
                            <button
                                onClick={() => setActiveTab('cortes')}
                                className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === 'cortes'
                                        ? 'border-slate-800 text-slate-800'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                Estatus de cortes ({filterData(cortesPagina.data, dateFilterCortes).length})
                            </button>
                            <button
                                onClick={() => setActiveTab('tiempos')}
                                className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === 'tiempos'
                                        ? 'border-slate-800 text-slate-800'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                Estatus de costura ({filterData(tiemposPagina.data, dateFilterTiempos).length})
                            </button>
                        </div>

                        {/* Contenido del Modal */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {loadingModalData ? (
                                <SewingLoader message="Cargando historial de costura" compact />
                            ) : (
                                <>
                                    {activeTab === 'asignaciones' && (
                                        <ReusableTable
                                            data={filterData(asignacionesPagina.data, dateFilterAsignaciones)}
                                            columns={asignacionesColumns}
                                            searchField="op"
                                            searchPlaceholder="Buscar asignación por OP..."
                                            hasMore={asignacionesPagina.hasMore}
                                            loadingMore={asignacionesPagina.loadingMore}
                                            onLoadMore={asignacionesPagina.loadMore}
                                        />
                                    )}

                                    {activeTab === 'cortes' && (
                                        <ReusableTable
                                            data={filterData(cortesPagina.data, dateFilterCortes)}
                                            columns={cortesColumns}
                                            searchField="op"
                                            searchPlaceholder="Buscar corte por OP..."
                                            hasMore={cortesPagina.hasMore}
                                            loadingMore={cortesPagina.loadingMore}
                                            onLoadMore={cortesPagina.loadMore}
                                        />
                                    )}

                                    {activeTab === 'tiempos' && (
                                        <ReusableTable
                                            data={filterData(tiemposPagina.data, dateFilterTiempos)}
                                            columns={tiemposColumns}
                                            searchField="op"
                                            searchPlaceholder="Buscar tiempo por OP..."
                                            hasMore={tiemposPagina.hasMore}
                                            loadingMore={tiemposPagina.loadingMore}
                                            onLoadMore={tiemposPagina.loadMore}
                                        />
                                    )}
                                </>
                            )}
                        </div>

                        {/* Pie del Modal */}
                        <div className="p-4 border-t border-gray-100 flex justify-end bg-slate-50">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-300 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    )
}
