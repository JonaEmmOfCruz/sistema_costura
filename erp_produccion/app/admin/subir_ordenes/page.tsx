'use client'

import { useEffect, useState } from "react"
import { Icon } from "@iconify/react"
import ReusableTable from "@/components/ReusableTable"

export default function SubirOrdenesPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [ordenes, setOrdenes] = useState([])

    // Estados para el Modal y las 3 tablas de Costura
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [activeTab, setActiveTab] = useState<'asignaciones' | 'cortes' | 'tiempos'>('asignaciones')
    
    const [asignaciones, setAsignaciones] = useState([])
    const [cortes, setCortes] = useState([])
    const [tiempos, setTiempos] = useState([])
    const [loadingModalData, setLoadingModalData] = useState(false)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setStatus(null)
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if(e.dataTransfer.files && e.dataTransfer.files[0]) {
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
            } else {
                setStatus({ type: 'error', message: data.message || 'Error al subir el archivo' })
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Error de conexión con el servidor' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setLoading(true)
        fetch('/api/ordenes')
            .then(res => res.json())
            .then(data => {
                if (data.success) setOrdenes(data.ordenes)
                setLoading(false)
            })
    }, [])

    // Helpers para datos e interpretación de nulos/fechas
    const renderNullSafe = (value: any) => {
        if (value === null || value === undefined || value === '') return '-'
        return value
    }

    const formatDateSafe = (dateValue: any) => {
        if (!dateValue) return '-'
        const date = new Date(dateValue)
        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString() // Usamos toLocaleDateString() para mostrar solo la fecha limpia
    }

    // Cargar los datos de las tres tablas al abrir el modal
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

    const columns = [
        {header: 'RQ', accessorKey: (row: any) => renderNullSafe(row.rq)},
        {header: 'OP', accessorKey: (row: any) => renderNullSafe(row.op)},
        {header: 'Producto', accessorKey: (row: any) => renderNullSafe(row.producto)},
        {header: 'Nombre', accessorKey: (row: any) => renderNullSafe(row.nombre)},
        {header: 'Observaciones', accessorKey: (row: any) => renderNullSafe(row.observaciones)},
        {header: 'Cantidad', accessorKey: (row: any) => renderNullSafe(row.cantidad)},
        {header: 'Cliente', accessorKey: (row: any) => renderNullSafe(row.cliente)},
        {
            header: 'Prioridad', 
            accessorKey: (row: any) =>{ 
                const prioridad = row.prioridad || 'Normal'

                let estilos = 'bg-gray-50 text-gray-600'

                switch (prioridad) {
                    case 'Urgente':
                        estilos = 'bg-orange-50 text-orange-600 border border-orange-100'
                        break;
                    case 'Prioridad 1':
                        estilos = 'bg-lime-50 text-lime-600 border border-lime-100'
                        break;
                    case 'Prioridad 2':
                        estilos = 'bg-sky-50 text-sky-600 border border-sky-100'
                        break;
                    case 'Prioridad 3':
                        estilos = 'bg-amber-50 text-amber-600 border border-amber-100'
                        break;
                }

                return (
                    <span className={`px-1.5 py-1 rounded-full text-xs font-medium ${estilos}`}>
                        {prioridad}
                    </span>
                )
            }
        },
        {
            header: 'Orden', 
            accessorKey: (row: any) =>{ 
                const ordn = row.orden || 'Normal'

                let estilos = 'bg-gray-50 text-gray-600'

                switch (ordn) {
                    case 'D':
                        estilos = 'bg-orange-50 text-orange-600 border border-orange-100'
                        break;
                    case 'A':
                        estilos = 'bg-lime-50 text-lime-600 border border-lime-100'
                        break;
                    case 'B':
                        estilos = 'bg-sky-50 text-sky-600 border border-sky-100'
                        break;
                    case 'C':
                        estilos = 'bg-amber-50 text-amber-600 border border-amber-100'
                        break;
                }

                return (
                    <span className={`px-1.5 py-1 rounded-full text-xs font-medium ${estilos}`}>
                        {ordn}
                    </span>
                )
            }
        },
        {
            header: 'Vigente Desde', 
            accessorKey: (row: any) => row.vigente_desde ? new Date(row.vigente_desde).toLocaleDateString() : '-'
        },
        {
            header: 'Fecha de entrega', 
            accessorKey: (row: any) => row.fecha_de_entrega ? new Date(row.fecha_de_entrega).toLocaleDateString() : '-'
        },
    ]

    // Columnas para Asignaciones
    const asignacionesColumns = [
        { header: 'RQ', accessorKey: (row: any) => renderNullSafe(row.rq) },
        { header: 'OP', accessorKey: (row: any) => renderNullSafe(row.op) },
        { header: 'Producto', accessorKey: (row: any) => renderNullSafe(row.producto) },
        { header: 'Nombre', accessorKey: (row: any) => renderNullSafe(row.nombre) },
        { header: 'Cant. Asignada', accessorKey: (row: any) => renderNullSafe(row.cantidad_asignada) },
        { header: 'Operador', accessorKey: (row: any) => renderNullSafe(row.nombre_operador) },
        { header: 'Asignado', accessorKey: (row: any) => renderNullSafe(row.creado_en) },
    ]

    // Columnas para Cortes
    const cortesColumns = [
        { header: 'RQ', accessorKey: (row: any) => renderNullSafe(row.rq) },
        { header: 'OP', accessorKey: (row: any) => renderNullSafe(row.op) },
        { header: 'Producto', accessorKey: (row: any) => renderNullSafe(row.producto) },
        { header: 'Nombre', accessorKey: (row: any) => renderNullSafe(row.nombre) },
        { header: 'Cantidad', accessorKey: (row: any) => renderNullSafe(row.cantidad) },
        { header: 'Inicio', accessorKey: (row: any) => renderNullSafe(row.fecha_inicio) },
        { header: 'Termino', accessorKey: (row: any) => renderNullSafe(row.fecha_fin) },
        { header: 'Asignado', accessorKey: (row: any) => renderNullSafe(row.creado_en) },
    ]

    // Columnas para Tiempos (operador_tiempos_costura)
    const tiemposColumns = [
        { header: 'RQ', accessorKey: (row: any) => renderNullSafe(row.rq) },
        { header: 'OP', accessorKey: (row: any) => renderNullSafe(row.op) },
        { header: 'Producto', accessorKey: (row: any) => renderNullSafe(row.producto) },
        { header: 'Nombre', accessorKey: (row: any) => renderNullSafe(row.nombre) },
        { header: 'Cant. Asignada', accessorKey: (row: any) => renderNullSafe(row.cantidad_asignada) },
        { header: 'Operador', accessorKey: (row: any) => renderNullSafe(row.nombre_operador) },
        { header: 'Fecha Inicio', accessorKey: (row: any) => formatDateSafe(row.fecha_inicio) },
        { header: 'Fecha Fin', accessorKey: (row: any) => formatDateSafe(row.fecha_fin) },
        { header: 'Asignado', accessorKey: (row: any) => formatDateSafe(row.creado_en) },
    ]

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
                            <span>Importar Órdenes</span>
                        </>
                    )}
                </button>
            </form>

            <div>
                <ReusableTable data={ordenes} columns={columns} searchField='op' searchPlaceholder="Buscar por op..."/>
            </div>

            {/* Modal con 3 pestañas: Asignaciones, Cortes y Tiempos */}
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
                                Asignaciones de costura ({asignaciones.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('cortes')}
                                className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === 'cortes'
                                        ? 'border-slate-800 text-slate-800'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                Estatus de cortes ({cortes.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('tiempos')}
                                className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === 'tiempos'
                                        ? 'border-slate-800 text-slate-800'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                Asignaciones de operadores ({tiempos.length})
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
                                            data={asignaciones}
                                            columns={asignacionesColumns}
                                            searchField="op"
                                            searchPlaceholder="Buscar asignación por OP..."
                                        />
                                    )}

                                    {activeTab === 'cortes' && (
                                        <ReusableTable
                                            data={cortes}
                                            columns={cortesColumns}
                                            searchField="op"
                                            searchPlaceholder="Buscar corte por OP..."
                                        />
                                    )}

                                    {activeTab === 'tiempos' && (
                                        <ReusableTable
                                            data={tiempos}
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