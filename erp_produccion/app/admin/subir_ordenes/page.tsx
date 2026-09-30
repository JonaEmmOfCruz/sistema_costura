'use client'

import { useEffect, useState } from "react"
import { Icon } from "@iconify/react"
import ReusableTable from "@/components/ReusableTable"

export default function SubirOrdenesPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    
    // Órdenes para la tabla principal
    const [ordenes, setOrdenes] = useState<any[]>([])

    // Estados para el Modal y las 3 tablas de Costura
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'asignaciones' | 'cortes' | 'tiempos'>('asignaciones')
    
    const [asignaciones, setAsignaciones] = useState<any[]>([])
    const [cortes, setCortes] = useState<any[]>([])
    const [tiempos, setTiempos] = useState<any[]>([])
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

        setLoading(true)
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
                cargarOrdenesPrincipales()
            } else {
                setStatus({ type: 'error', message: data.message || 'Error al subir el archivo' })
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Error de conexión con el servidor' })
        } finally {
            setLoading(false)
        }
    }

    // Cargar las órdenes principales
    const cargarOrdenesPrincipales = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin_costura/ordenes')
            const data = await res.json()
            if (data.success) {
                setOrdenes(data.ordenes)
            }
        } catch (error) {
            console.error("Error al cargar órdenes:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarOrdenesPrincipales()
    }, [])

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
    const handleOpenModal = () => {
        setIsModalOpen(true)
        setLoadingModalData(true)

        Promise.all([
            fetch('/api/costura-asignaciones').then(res => res.json()),
            fetch('/api/costura-cortes').then(res => res.json()),
            fetch('/api/costura-tiempos').then(res => res.json())
        ])
        .then(([dataAsignaciones, dataCortes, dataTiempos]) => {
            if (dataAsignaciones.success) setAsignaciones(dataAsignaciones.asignaciones)
            if (dataCortes.success) setCortes(dataCortes.cortes)
            if (dataTiempos.success) setTiempos(dataTiempos.tiempos)
        })
        .catch(err => console.error("Error al cargar datos del modal:", err))
        .finally(() => setLoadingModalData(false))
    }

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
                    {/* Input date transparente superpuesto al icono para activar el selector nativo del navegador */}
                    <input
                        type="date"
                        value={activeDate}
                        onChange={(e) => {
                            if (e.target.value) {
                                // Al seleccionar una nueva fecha se desactiva y limpia el filtro anterior
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
            header: <DateHeader title="Asignado" fieldKey="creado_en" currentFilter={dateFilterCortes} setFilter={setDateFilterCortes} />, 
            accessorKey: (row: any) => formatDateSafe(row.creado_en) 
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
            header: <DateHeader title="Asignado" fieldKey="creado_en" currentFilter={dateFilterTiempos} setFilter={setDateFilterTiempos} />, 
            accessorKey: (row: any) => formatDateSafe(row.creado_en) 
        },
    ]

    // Función de filtrado por columna de fecha
    const filterData = (items: any[], dateFilter?: { field: string; date: string } | null) => {
        let result = items

        // Aplicar filtro de fecha específico de columna activa
        if (dateFilter && dateFilter.field && dateFilter.date) {
            result = result.filter(item => {
                const itemDate = getDateString(item[dateFilter.field])
                return itemDate === dateFilter.date
            })
        }

        return result
    }

    if (loading) return <div className="text-center py-10 text-gray-400 text-sm">Cargando órdenes...</div>

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
                    <span>Ver Tablas Costura</span>
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
                    disabled={!file || loading}
                    className="w-full bg-slate-900 text-white p-3.5 rounded-2xl font-medium hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                    {loading ? (
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
                <ReusableTable data={ordenes} columns={columns} searchField='op' searchPlaceholder="Buscar por op..."/>
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
                                Asignaciones de costura ({filterData(asignaciones, dateFilterAsignaciones).length})
                            </button>
                            <button
                                onClick={() => setActiveTab('cortes')}
                                className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === 'cortes'
                                        ? 'border-slate-800 text-slate-800'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                Estatus de cortes ({filterData(cortes, dateFilterCortes).length})
                            </button>
                            <button
                                onClick={() => setActiveTab('tiempos')}
                                className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === 'tiempos'
                                        ? 'border-slate-800 text-slate-800'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                Asignaciones de operadores ({filterData(tiempos, dateFilterTiempos).length})
                            </button>
                        </div>

                        {/* Contenido del Modal */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {loadingModalData ? (
                                <div className="text-center py-10 text-gray-400 text-sm flex items-center justify-center gap-2">
                                    <Icon icon="lucide:loader-2" className="animate-spin text-lg" />
                                    <span>Cargando información...</span>
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'asignaciones' && (
                                        <ReusableTable
                                            data={filterData(asignaciones, dateFilterAsignaciones)}
                                            columns={asignacionesColumns}
                                            searchField="op"
                                            searchPlaceholder="Buscar asignación por OP..."
                                        />
                                    )}

                                    {activeTab === 'cortes' && (
                                        <ReusableTable
                                            data={filterData(cortes, dateFilterCortes)}
                                            columns={cortesColumns}
                                            searchField="op"
                                            searchPlaceholder="Buscar corte por OP..."
                                        />
                                    )}

                                    {activeTab === 'tiempos' && (
                                        <ReusableTable
                                            data={filterData(tiempos, dateFilterTiempos)}
                                            columns={tiemposColumns}
                                            searchField="op"
                                            searchPlaceholder="Buscar tiempo por OP..."
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