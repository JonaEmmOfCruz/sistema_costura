'use client'

import { useEffect, useState } from "react"
import { Icon } from "@iconify/react"
import ReusableTable from "@/components/ReusableTable"

interface PeticionTiempo {
    id: number;
    op: string;
    modelo: string;
    codigo: string;
    nombre_secundario: string;
    fecha_solicitud?: string;
}

export default function SubirTiemposProductosPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [productos, setProductos] = useState<any[]>([])

    // Estado para la lista de peticiones de la BD
    const [peticiones, setPeticiones] = useState<PeticionTiempo[]>([])
    const [peticionSeleccionada, setPeticionSeleccionada] = useState<PeticionTiempo | null>(null)

    // Estados para el proceso de escaneo / búsqueda automática
    const [buscando, setBuscando] = useState(false)
    const [formEditable, setFormEditable] = useState({
        modelo: '',
        nombre: '',
        codigo: '',
        nombre_secundario: '',
        costura: '',
        tiempo: ''
    })

    // Filtros de tabla
    const [columnFilters, setColumnFilters] = useState<{ [key: string]: string[] }>({})
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
                cargarPeticiones()
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
                if (data.success) setProductos(data.productos || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }

    const cargarPeticiones = () => {
        fetch('/api/productos/peticiones')
            .then(res => res.json())
            .then(data => {
                if (data.success) setPeticiones(data.peticiones || [])
            })
            .catch(() => {})
    }

    useEffect(() => {
        cargarProductos()
        cargarPeticiones()
    }, [])

    // FILTRADO AUTOMÁTICO: Oculta peticiones que ya tengan un tiempo registrado en la tabla de productos
    const peticionesPendientes = peticiones.filter(peticion => {
        const yaTieneTiempo = productos.some(prod => {
            const coincideCodigo = prod.codigo && peticion.codigo && 
                String(prod.codigo).trim().toLowerCase() === String(peticion.codigo).trim().toLowerCase();
            
            const coincideNombre = prod.nombre_secundario && peticion.nombre_secundario && 
                String(prod.nombre_secundario).trim().toLowerCase() === String(peticion.nombre_secundario).trim().toLowerCase();

            const tieneTiempoValido = prod.tiempo && String(prod.tiempo).trim() !== '' && Number(prod.tiempo) > 0;

            return (coincideCodigo || coincideNombre) && tieneTiempoValido;
        });

        return !yaTieneTiempo;
    });

    // BÚSQUEDA AUTOMÁTICA Y ANIMACIÓN AL SELECCIONAR UNA PETICIÓN
    const handleAsignarTiempoClick = async (peticion: PeticionTiempo) => {
        setPeticionSeleccionada(peticion)
        setBuscando(true)
        setStatus(null)

        setFormEditable({
            modelo: peticion.modelo || '',
            nombre: '',
            codigo: peticion.codigo || '',
            nombre_secundario: peticion.nombre_secundario || '',
            costura: '',
            tiempo: ''
        })

        try {
            const res = await fetch(`/api/productos/buscar_modelo?modelo=${encodeURIComponent(peticion.modelo)}`)
            const data = await res.json()

            await new Promise(r => setTimeout(r, 800));

            if (data.success && data.coincidencia) {
                const c = data.coincidencia;
                setFormEditable({
                    modelo: peticion.modelo,
                    nombre: c.nombre || '',
                    codigo: peticion.codigo,
                    nombre_secundario: peticion.nombre_secundario,
                    costura: c.costura || '1',
                    tiempo: String(c.tiempo || '')
                })
                setStatus({
                    type: 'success',
                    message: `Información recuperada automáticamente del modelo "${peticion.modelo}". Puedes editarla antes de confirmar.`
                })
            } else {
                setStatus({
                    type: 'error',
                    message: `No se encontraron tiempos registrados previamente para el modelo "${peticion.modelo}". Favor de capturarlos manualmente.`
                })
            }
        } catch (error) {
            console.error('Error buscando modelo:', error)
        } finally {
            setBuscando(false)
        }
    }

    // ACEPTAR Y REGISTRAR TIEMPO CONFIRMADO
    const handleConfirmarPeticion = async () => {
        if (!peticionSeleccionada) return;
        setLoading(true)

        try {
            const res = await fetch('/api/productos/peticiones/aprobar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    peticion_id: peticionSeleccionada.id,
                    ...formEditable
                })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setStatus({ type: 'success', message: 'Tiempo asignado y registrado correctamente en el sistema.' })
                setPeticionSeleccionada(null)
                cargarProductos()
                cargarPeticiones()
            } else {
                setStatus({ type: 'error', message: data.message || 'Error al guardar la asignación.' })
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Error al conectar con el servidor.' })
        } finally {
            setLoading(false)
        }
    }

    // RECHAZAR O DESCARTAR PETICIÓN
    const handleRechazarPeticion = async (id: number) => {
        setLoading(true)
        try {
            const res = await fetch('/api/productos/peticiones/rechazar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ peticion_id: id })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setStatus({ type: 'success', message: 'Petición rechazada y eliminada de la cola.' })
                if (peticionSeleccionada?.id === id) setPeticionSeleccionada(null)
                cargarPeticiones()
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'No se pudo rechazar la petición.' })
        } finally {
            setLoading(false)
        }
    }

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

    const clearFilter = (fieldKey: string) => {
        setColumnFilters(prev => {
            const updated = { ...prev }
            delete updated[fieldKey]
            return updated
        })
    }

    const FilterHeaderModal = ({ title, fieldKey }: { title: string, fieldKey: string }) => {
        const isModalOpen = activeFilterField === fieldKey
        const selectedOptions = columnFilters[fieldKey] || []
        const isFiltered = selectedOptions.length > 0

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

                {isModalOpen && (
                    <>
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

    const columns = [
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
                    Atiende las peticiones de tiempo solicitadas desde asignación de órdenes o sube cargas masivas por Excel.
                </p>
            </div>

            {/* SECCIÓN 1: LISTA DE PETICIONES DE TIEMPO SOLICITADAS */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Icon icon="lucide:clock" className="text-indigo-600" />
                        Peticiones de Tiempo Solicitadas
                        {peticionesPendientes.length > 0 && (
                            <span className="ml-2 px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full">
                                {peticionesPendientes.length} pendientes
                            </span>
                        )}
                    </h2>
                    <button 
                        onClick={() => { cargarProductos(); cargarPeticiones(); }}
                        className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1 font-medium"
                    >
                        <Icon icon="lucide:refresh-cw" /> Actualizar
                    </button>
                </div>

                {peticionesPendientes.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                        <Icon icon="lucide:check-circle-2" className="text-3xl text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-700">Sin peticiones pendientes</p>
                        <p className="text-xs text-gray-400">Todas las solicitudes de tiempo han sido procesadas o ya cuentan con métrica registrada.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {peticionesPendientes.map((p) => (
                            <div 
                                key={p.id}
                                className={`p-4 rounded-2xl border transition-all ${
                                    peticionSeleccionada?.id === p.id 
                                        ? 'border-indigo-500 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-200' 
                                        : 'border-gray-200 bg-white hover:border-indigo-300'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-700 rounded-md">
                                        Modelo: {p.modelo}
                                    </span>
                                    {p.op && <span className="text-[11px] font-semibold text-gray-500">OP: {p.op}</span>}
                                </div>

                                <div className="space-y-1 mb-4">
                                    <p className="text-xs font-bold text-gray-800 truncate" title={p.codigo}>
                                        Código: <span className="font-normal text-gray-600">{p.codigo}</span>
                                    </p>
                                    <p className="text-xs font-bold text-gray-800 truncate" title={p.nombre_secundario}>
                                        Producto: <span className="font-normal text-gray-600">{p.nombre_secundario}</span>
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleAsignarTiempoClick(p)}
                                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Icon icon="lucide:sparkles" className="text-sm" />
                                    Asignar Tiempo
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* ANIMACIÓN Y PANEL DE EDICIÓN DE INFORMACIÓN OBTENIDA */}
                {buscando && (
                    <div className="p-8 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center space-y-3 animate-pulse">
                        <Icon icon="lucide:search" className="text-3xl text-indigo-600 animate-bounce" />
                        <p className="text-sm font-semibold text-indigo-900">
                            Analizando y recuperando información del modelo "{peticionSeleccionada?.modelo}"...
                        </p>
                        <p className="text-xs text-indigo-600">Buscando métricas de costura y tiempo en la base de datos.</p>
                    </div>
                )}

                {!buscando && peticionSeleccionada && (
                    <div className="p-6 bg-slate-50/80 rounded-3xl border border-slate-200 space-y-4 animate-in fade-in duration-300">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                <Icon icon="lucide:edit-3" className="text-indigo-600" />
                                Revisar y Editar Información Obtenida
                            </h3>
                            <button onClick={() => setPeticionSeleccionada(null)} className="text-gray-400 hover:text-gray-600">
                                <Icon icon="lucide:x" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Modelo</label>
                                <input
                                    type="text"
                                    value={formEditable.modelo}
                                    onChange={e => setFormEditable({ ...formEditable, modelo: e.target.value })}
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={formEditable.nombre}
                                    onChange={e => setFormEditable({ ...formEditable, nombre: e.target.value })}
                                    placeholder="Ej. MODELO BASE COSTURA"
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Código (Producto)</label>
                                <input
                                    type="text"
                                    value={formEditable.codigo}
                                    onChange={e => setFormEditable({ ...formEditable, codigo: e.target.value })}
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Producto (Descripción)</label>
                                <input
                                    type="text"
                                    value={formEditable.nombre_secundario}
                                    onChange={e => setFormEditable({ ...formEditable, nombre_secundario: e.target.value })}
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Costura</label>
                                <input
                                    type="text"
                                    value={formEditable.costura}
                                    onChange={e => setFormEditable({ ...formEditable, costura: e.target.value })}
                                    placeholder="Ej. 1"
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Tiempo (segundos por unidad)</label>
                                <input
                                    type="text"
                                    value={formEditable.tiempo}
                                    onChange={e => setFormEditable({ ...formEditable, tiempo: e.target.value })}
                                    placeholder="Ej. 120"
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        {status && (
                            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                <Icon icon={status.type === 'success' ? "lucide:check-circle" : "lucide:alert-circle"} className="text-base shrink-0" />
                                <span>{status.message}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => handleRechazarPeticion(peticionSeleccionada.id)}
                                disabled={loading}
                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
                            >
                                <Icon icon="lucide:x-circle" className="text-sm" />
                                Rechazar Petición
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmarPeticion}
                                disabled={loading || !formEditable.tiempo}
                                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Icon icon="lucide:loader-2" className="animate-spin text-sm" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="lucide:check" className="text-sm" />
                                        Confirmar y Asignar Tiempo
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* SECCIÓN 2: CARGA MASIVA POR EXCEL */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
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
                                        Arrastra tu archivo aquí, o <span className="text-slate-600 uppercase font-bold">busca en tu equipo</span>
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
                        <Icon icon="lucide:upload-cloud" className="text-xl" />
                        <span>Subir Excel</span>
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