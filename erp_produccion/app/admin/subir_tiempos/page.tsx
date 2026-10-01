'use client'

import { useEffect, useState } from "react"
import { Icon } from "@iconify/react"
import ReusableTable from "@/components/ReusableTable"

export default function SubirTiemposProductosPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [productos, setProductos] = useState<any[]>([])

    // Estados para el formulario de gestión (Agregar / Modificar / Eliminar)
    const [modo, setModo] = useState<'agregar' | 'modificar' | 'eliminar'>('agregar')
    const [formDataManual, setFormDataManual] = useState({
        modelo: '',
        nombre: '',
        codigo: '',
        nombre_secundario: '',
        costura: '',
        tiempo: ''
    })
    const [nombreSeleccionado, setNombreSeleccionado] = useState('')
    const [idEliminar, setIdEliminar] = useState('')

    // Estado global de filtros mediante checkboxes por campo: { [key]: string[] }
    const [columnFilters, setColumnFilters] = useState<{ [key: string]: string[] }>({})
    
    // Estado para controlar qué modal de filtro está abierto actualmente
    const [activeFilterField, setActiveFilterField] = useState<string | null>(null)

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

    const handleExcelSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        setStatus(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/productos/subir-tiempos', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setStatus({ type: 'success', message: data.message })
                setFile(null)
                cargarProductos()
            } else {
                setStatus({ type: 'error', message: data.message || 'Error al procesar el archivo Excel' })
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Error de conexión con el servidor' })
        } finally {
            setLoading(false)
        }
    }

    const cargarProductos = () => {
        setLoading(true)
        fetch('/api/productos/tiempos')
            .then(res => res.json())
            .then(data => {
                if (data.success) setProductos(data.productos)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }

    useEffect(() => {
        cargarProductos()
    }, [])

    // Manejo del formulario CRUD manual
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setStatus(null)

        try {
            let endpoint = '/api/productos/crud'
            let method = 'POST'
            let bodyData: any = {}

            if (modo === 'agregar') {
                method = 'POST'
                bodyData = { accion: 'agregar', ...formDataManual }
            } else if (modo === 'modificar') {
                method = 'PUT'
                bodyData = { accion: 'modificar_por_nombre', nombre: nombreSeleccionado, tiempo: formDataManual.tiempo }
            } else if (modo === 'eliminar') {
                method = 'DELETE'
                bodyData = { accion: 'eliminar_individual', id: idEliminar }
            }

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setStatus({ type: 'success', message: data.message })
                cargarProductos()
                setFormDataManual({ modelo: '', nombre: '', codigo: '', nombre_secundario: '', costura: '', tiempo: '' })
                setNombreSeleccionado('')
                setIdEliminar('')
            } else {
                setStatus({ type: 'error', message: data.message || 'Error al procesar la operación' })
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Error de conexión con el servidor' })
        } finally {
            setLoading(false)
        }
    }

    // Obtener lista única de nombres para el select de modificación masiva
    const nombresUnicos = Array.from(new Set(productos.map(p => p.nombre))).filter(Boolean)

    // Lógica para alternar selecciones de checkbox en el filtro
    const toggleFilterOption = (fieldKey: string, optionValue: string) => {
        setColumnFilters(prev => {
            const currentSelected = prev[fieldKey] || []
            let newSelected: string[] = []

            if (currentSelected.includes(optionValue)) {
                newSelected = currentSelected.filter(item => item !== optionValue)
            } else {
                newSelected = [...currentSelected, optionValue]
            }

            if (newSelected.length === 0) {
                const updated = { ...prev }
                delete updated[fieldKey]
                return updated
            }

            return { ...prev, [fieldKey]: newSelected }
        })
    }

    // Limpiar filtro específico
    const clearFilter = (fieldKey: string) => {
        setColumnFilters(prev => {
            const updated = { ...prev }
            delete updated[fieldKey]
            return updated
        })
    }

    // Componente para el Encabezado con Icono y Modal desplegable de Checkboxes
    const FilterHeaderModal = ({ title, fieldKey }: { title: string, fieldKey: string }) => {
        const isModalOpen = activeFilterField === fieldKey
        const selectedOptions = columnFilters[fieldKey] || []
        const isFiltered = selectedOptions.length > 0

        // Extraer valores únicos disponibles para el campo
        const uniqueValues = Array.from(
            new Set(productos.map(item => String(item[fieldKey] ?? '-')))
        ).sort()

        return (
            <div className="relative flex items-center justify-between gap-1.5 select-none">
                <span className="uppercase text-xs font-bold">{title}</span>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        setActiveFilterField(isModalOpen ? null : fieldKey)
                    }}
                    className={`p-1 rounded-md transition-colors ${
                        isFiltered 
                            ? 'bg-rose-100 text-rose-600 font-bold' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                    title={`Filtrar por ${title}`}
                >
                    <Icon icon="lucide:filter" className="text-sm" />
                </button>

                {/* Modal Desplegable por Checkbox */}
                {isModalOpen && (
                    <>
                        {/* Overlay invisible para cerrar al hacer clic fuera */}
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setActiveFilterField(null)} 
                        />
                        
                        <div 
                            className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 p-4 text-left font-normal normal-case"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                                <span className="text-xs font-bold text-gray-700">Filtrar por {title}</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveFilterField(null)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                                >
                                    <Icon icon="lucide:x" className="text-sm" />
                                </button>
                            </div>

                            {/* Opciones en lista fija sin scroll interno */}
                            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
                                {uniqueValues.map((val) => {
                                    const checked = selectedOptions.includes(val)
                                    return (
                                        <div
                                            key={`${fieldKey}-${val}`}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                toggleFilterOption(fieldKey, val)
                                            }}
                                            className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-slate-700 select-none"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                readOnly
                                                className="rounded border-gray-300 text-rose-600 focus:ring-0 w-3.5 h-3.5 pointer-events-none"
                                            />
                                            <span className="truncate">{val}</span>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Acciones del Modal */}
                            {isFiltered && (
                                <div className="pt-2 mt-2 border-t border-gray-100 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => clearFilter(fieldKey)}
                                        className="text-xs text-rose-600 font-medium hover:underline flex items-center gap-1"
                                    >
                                        <Icon icon="lucide:rotate-ccw" className="text-xs" />
                                        Limpiar filtro
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        )
    }

    // Definición de columnas (Sin columna ID)
    const columns = [
        {
            header: 'ACCIONES',
            accessorKey: (row: any) => (
                <button
                    onClick={() => {
                        setModo('eliminar')
                        setIdEliminar(row.id)
                        window.scrollTo({ top: 400, behavior: 'smooth' })
                    }}
                    className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 text-xs flex items-center gap-1 font-medium"
                    title="Eliminar este registro individualmente"
                >
                    <Icon icon="lucide:trash-2" className="text-sm" />
                    <span>Eliminar</span>
                </button>
            )
        },
        {
            header: <FilterHeaderModal title="Modelo" fieldKey="modelo" />,
            accessorKey: 'modelo'
        },
        {
            header: <FilterHeaderModal title="Nombre" fieldKey="nombre" />,
            accessorKey: 'nombre'
        },
        {
            header: <FilterHeaderModal title="Código" fieldKey="codigo" />,
            accessorKey: 'codigo'
        },
        {
            header: <FilterHeaderModal title="Producto" fieldKey="nombre_secundario" />,
            accessorKey: 'nombre_secundario'
        },
        {
            header: <FilterHeaderModal title="Costura" fieldKey="costura" />,
            accessorKey: 'costura'
        },
        {
            header: <FilterHeaderModal title="Tiempo" fieldKey="tiempo" />,
            accessorKey: 'tiempo'
        }
    ]

    // Aplicar filtrado por checkboxes
    const productosFiltrados = productos.filter(row => {
        return Object.keys(columnFilters).every(fieldKey => {
            const allowedValues = columnFilters[fieldKey]
            if (!allowedValues || allowedValues.length === 0) return true
            const rowValue = String(row[fieldKey] ?? '-')
            return allowedValues.includes(rowValue)
        })
    })

    return (
        <div className="mx-auto space-y-8 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Gestión de Tiempos y Productos</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Sube un archivo Excel o administra individual y masivamente los registros de tiempos.
                </p>
            </div>

            {/* SECCIÓN 1: SUBIR EXCEL */}
            <div className=" p-6 rounded-3xl space-y-6">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Icon icon="lucide:file-spreadsheet" className="text-slate-600" />
                    Carga Masiva por Excel
                </h2>
                <form onSubmit={handleExcelSubmit} className="space-y-4">
                    <div onDrop={handleDrop} onDragOver={handleDragOver} className="border-2 border-dashed border-gray-200 hover:border-slate-500 transition-colors rounded-3xl p-10 text-center bg-slate-50 shadow-sm relative cursor-pointer group">
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-14 h-14 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Icon icon="mdi:book-clock" className="text-3xl" />
                            </div>

                            {file ? (
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Archivo listo para cargar</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium text-gray-700">
                                        Arrastra tu archivo aquí, o <span className="text-slate-600 uppercase">busca en tu equipo</span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Formatos soportados: .xlsx, .xls, .csv</p>
                                </div>
                            )}

                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={!file || loading}
                        className="w-full bg-slate-900 text-white p-3 rounded-xl font-medium hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <>
                            <Icon icon="lucide:upload-cloud" className="text-xl" />
                            <span>Subir Manual</span>
                        </>
                    </button>
                </form>
            </div>

            {/* SECCIÓN 2: FORMULARIO AGREGAR, MODIFICAR Y ELIMINAR */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:sliders" className="text-indigo-600" />
                        Formulario de Gestión Manual
                    </h2>
                    <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => setModo('agregar')}
                            className={`px-4 py-2 rounded-lg transition-all ${modo === 'agregar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            Agregar Nuevo
                        </button>
                        <button
                            type="button"
                            onClick={() => setModo('modificar')}
                            className={`px-4 py-2 rounded-lg transition-all ${modo === 'modificar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            Modificar por Nombre
                        </button>
                        <button
                            type="button"
                            onClick={() => setModo('eliminar')}
                            className={`px-4 py-2 rounded-lg transition-all ${modo === 'eliminar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            Eliminar Individual
                        </button>
                    </div>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-4">
                    {modo === 'agregar' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
                                <input type="text" value={formDataManual.modelo} onChange={e => setFormDataManual({ ...formDataManual, modelo: e.target.value })} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-slate-500" required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                                <input type="text" value={formDataManual.nombre} onChange={e => setFormDataManual({ ...formDataManual, nombre: e.target.value })} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-slate-500" required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Código</label>
                                <input type="text" value={formDataManual.codigo} onChange={e => setFormDataManual({ ...formDataManual, codigo: e.target.value })} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-slate-500" required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Producto (Descripción)</label>
                                <input type="text" value={formDataManual.nombre_secundario} onChange={e => setFormDataManual({ ...formDataManual, nombre_secundario: e.target.value })} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-slate-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Costura</label>
                                <input type="text" value={formDataManual.costura} onChange={e => setFormDataManual({ ...formDataManual, costura: e.target.value })} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-slate-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Tiempo</label>
                                <input type="text" value={formDataManual.tiempo} onChange={e => setFormDataManual({ ...formDataManual, tiempo: e.target.value })} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm focus:outline-none focus:border-slate-500" required />
                            </div>
                        </div>
                    )}

                    {modo === 'modificar' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Seleccionar Nombre (Aplica para todos los coincidentes)</label>
                                <select
                                    value={nombreSeleccionado}
                                    onChange={e => setNombreSeleccionado(e.target.value)}
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-amber-500"
                                    required
                                >
                                    <option value="">-- Selecciona un Nombre --</option>
                                    {nombresUnicos.map((nom: any, idx) => (
                                        <option key={idx} value={nom}>{nom}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nuevo Tiempo (para todos los del nombre seleccionado)</label>
                                <input
                                    type="text"
                                    value={formDataManual.tiempo}
                                    onChange={e => setFormDataManual({ ...formDataManual, tiempo: e.target.value })}
                                    placeholder="Ej. 900"
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-amber-500"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {modo === 'eliminar' && (
                        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                            <label className="block text-xs font-medium text-gray-700 mb-1">ID del registro a eliminar</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={idEliminar}
                                    onChange={e => setIdEliminar(e.target.value)}
                                    placeholder="Introduce el ID o haz clic en 'Eliminar' en la tabla inferior"
                                    className="w-full border border-gray-200 bg-white p-2.5 text-slate-600 rounded-xl text-sm focus:outline-none focus:border-rose-500"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {status && (
                        <div className={`p-4 rounded-2xl text-sm flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            <Icon icon={status.type === 'success' ? "lucide:check-circle" : "lucide:alert-circle"} className="text-xl shrink-0" />
                            <span>{status.message}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full p-3.5 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 shadow-sm ${modo === 'agregar' ? 'bg-slate-900 hover:bg-slate-800' :
                                modo === 'modificar' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                            }`}
                    >
                        {loading ? (
                            <>
                                <Icon icon="lucide:loader-2" className="text-xl animate-spin" />
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <>
                                <Icon icon={modo === 'agregar' ? 'lucide:plus-circle' : modo === 'modificar' ? 'lucide:edit-3' : 'lucide:trash-2'} className="text-xl" />
                                <span>{modo === 'agregar' ? 'Registrar Producto' : modo === 'modificar' ? 'Actualizar Tiempo Masivamente' : 'Eliminar Registro'}</span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* SECCIÓN 3: TABLA DE DATOS */}
            <div>
                <ReusableTable
                    data={productosFiltrados}
                    columns={columns}
                    searchField='nombre'
                    searchPlaceholder="Buscar por nombre..."
                />
            </div>
        </div>
    )
}