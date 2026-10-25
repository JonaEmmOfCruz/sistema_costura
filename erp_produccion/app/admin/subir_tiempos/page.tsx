'use client'

import { useEffect, useMemo, useState } from "react"
import { Icon } from "@iconify/react"
import useRealtimeRefresh from "@/lib/useRealtimeRefresh"
import useLatestRequest from "@/lib/useLatestRequest"
import usePaginatedApi from "@/lib/usePaginatedApi"
import SewingLoader from "@/components/SewingLoader"

interface PeticionTiempo {
    id: number;
    op: string;
    modelo: string;
    codigo: string;
    nombre_secundario: string;
    fecha_solicitud?: string;
}

interface ProductoTiempo {
    id?: number
    id_proceso?: number | string | null
    [key: string]: string | number | null | undefined
    cod_proceso?: string | null
    descripcion?: string | null
    t_costura?: number | string | null
}

const CAMPOS_PRODUCTO: { key: keyof ProductoTiempo; label: string; numeric?: boolean }[] = [
    { key: 'cod_proceso', label: 'Código de proceso' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'costura', label: 'Costura' },
    { key: 't_costura', label: 'Tiempo costura (segundos)', numeric: true },
    { key: 'tapizado', label: 'Tapizado' },
    { key: 't_tapizado', label: 'Tiempo tapizado (segundos)', numeric: true },
    { key: 'armado', label: 'Armado' },
    { key: 't_armado', label: 'Tiempo armado (segundos)', numeric: true },
    { key: 'montado', label: 'Montado' },
    { key: 't_montado', label: 'Tiempo montado (segundos)', numeric: true },
    { key: 'empaque', label: 'Empaque' },
    { key: 't_empaque', label: 'Tiempo empaque (segundos)', numeric: true },
    { key: 'corte', label: 'Corte' },
    { key: 't_corte', label: 'Tiempo corte (segundos)', numeric: true },
]

const productoVacio = () => Object.fromEntries(CAMPOS_PRODUCTO.map(({ key }) => [key, ''])) as Record<string, string>

export default function SubirTiemposProductosPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const { data: productos, setData: setProductos, loading: loadingProductos, loadingMore, hasMore, loadMore, reload: cargarProductos } = usePaginatedApi<ProductoTiempo>('/api/productos/tiempos', 'productos')

    // Estado para la lista de peticiones de la BD
    const { data: peticiones, loading: loadingPeticiones, loadingMore: loadingMorePeticiones, hasMore: hasMorePeticiones, loadMore: loadMorePeticiones, reload: cargarPeticiones } = usePaginatedApi<PeticionTiempo>('/api/productos/peticiones', 'peticiones')
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
    const isLatestRequest = useLatestRequest()
    const [borradoresProductos, setBorradoresProductos] = useState<Record<number, Record<string, string>>>({})
    const [nuevoProducto, setNuevoProducto] = useState<Record<string, string>>(productoVacio)
    const [guardandoProducto, setGuardandoProducto] = useState(false)
    const [busquedaCatalogo, setBusquedaCatalogo] = useState('')
    const [estadoCatalogo, setEstadoCatalogo] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const actualizarCelda = (producto: ProductoTiempo, campo: string, valor: string) => {
        if (producto.id === null || producto.id === undefined) return
        setBorradoresProductos(current => ({
            ...current,
            [producto.id as number]: {
                ...Object.fromEntries(CAMPOS_PRODUCTO.map(({ key }) => [key, String(producto[key] ?? '')])),
                ...current[producto.id as number],
                [campo]: valor,
            },
        }))
    }

    const guardarProducto = async (id: number) => {
        const borrador = borradoresProductos[id]
        const original = productos.find(row => Number(row.id) === id)
        if (!borrador || !original) return true
        const producto = Object.fromEntries(CAMPOS_PRODUCTO
            .filter(({ key }) => String(original[key] ?? '') !== String(borrador[String(key)] ?? original[key] ?? ''))
            .map(({ key }) => [String(key), borrador[String(key)]]))
        if (!Object.keys(producto).length) return true
        setGuardandoProducto(true)
        try {
            const response = await fetch('/api/productos/crud', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accion: 'modificar_producto', id, producto }),
            })
            const result = await response.json()
            if (!response.ok || !result.success) throw new Error(result.message || 'No se pudo guardar el producto.')
            if (result.merged) {
                setProductos(current => current.filter(row => Number(row.id) !== id))
                await cargarProductos()
            } else {
                setProductos(current => current.map(row => Number(row.id) === id ? { ...row, ...producto } : row))
            }
            setBorradoresProductos(current => { const next = { ...current }; delete next[id]; return next })
            setEstadoCatalogo({ type: 'success', message: result.message })
            return true
        } catch (error) {
            setEstadoCatalogo({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo guardar el producto.' })
            return false
        } finally {
            setGuardandoProducto(false)
        }
    }

    const agregarProducto = async () => {
        setGuardandoProducto(true)
        try {
            const response = await fetch('/api/productos/crud', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accion: 'agregar', producto: nuevoProducto }),
            })
            const result = await response.json()
            if (!response.ok || !result.success) throw new Error(result.message || 'No se pudo agregar el producto.')
            setNuevoProducto(productoVacio())
            setEstadoCatalogo({ type: 'success', message: result.message })
            await cargarProductos()
        } catch (error) {
            setEstadoCatalogo({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo agregar el producto.' })
        } finally {
            setGuardandoProducto(false)
        }
    }

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

    useRealtimeRefresh(async () => {
        await Promise.all([cargarProductos(), cargarPeticiones()])
    })

    const peticionesPendientes = peticiones

    // BÚSQUEDA AUTOMÁTICA Y ANIMACIÓN AL SELECCIONAR UNA PETICIÓN
    const handleAsignarTiempoClick = async (peticion: PeticionTiempo) => {
        const esUltimaBusqueda = isLatestRequest('buscarModelo')
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
            const params = new URLSearchParams({
                modelo: peticion.modelo || '',
                codigo: peticion.codigo || '',
                nombre: peticion.nombre_secundario || ''
            })
            const res = await fetch(`/api/productos/buscar_modelo?${params.toString()}`, { cache: 'no-store' })
            const data = await res.json()

            await new Promise(r => setTimeout(r, 800));

            if (!esUltimaBusqueda()) return
            if (data.success && data.coincidencia) {
                const c = data.coincidencia;
                const criterio = data.criterio === 'nombre'
                    ? 'por nombre coincidente'
                    : data.criterio === 'codigo'
                        ? 'por código coincidente'
                        : 'por pertenecer a la misma familia del producto'
                setFormEditable({
                    modelo: peticion.modelo,
                    nombre: c.nombre || '',
                    codigo: peticion.codigo,
                    nombre_secundario: peticion.nombre_secundario,
                    costura: c.costura || '1',
                    tiempo: String(c.t_costura || '')
                })
                setStatus({
                    type: 'success',
                    message: `Información recuperada ${criterio}. Se copiaron costura y tiempo desde "${c.codigo || c.modelo || peticion.modelo}". Puedes editarla antes de confirmar.`
                })
            } else {
                setStatus({
                    type: 'error',
                    message: data.message || `No se encontraron productos con nombre coincidente ni de la misma familia de "${peticion.codigo}". Captura costura y tiempo manualmente.`
                })
            }
        } catch (error) {
            console.error('Error buscando modelo:', error)
            if (esUltimaBusqueda()) {
                setStatus({ type: 'error', message: 'No se pudo buscar la información del producto. Intenta de nuevo.' })
            }
        } finally {
            if (esUltimaBusqueda()) setBuscando(false)
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

    const productosFiltrados = productos.filter(row => {
        const termino = busquedaCatalogo.trim().toLocaleLowerCase()
        const coincideBusqueda = !termino || String(row.cod_proceso ?? '').toLocaleLowerCase().includes(termino)
        return coincideBusqueda && Object.keys(columnFilters).every(fieldKey => {
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

                {loadingPeticiones ? <SewingLoader message="Cargando solicitudes de tiempo" compact /> : peticionesPendientes.length === 0 ? (
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

                {hasMorePeticiones && (
                    <div className="flex justify-center">
                        <button type="button" onClick={loadMorePeticiones} disabled={loadingMorePeticiones} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-60">
                            {loadingMorePeticiones ? 'Cargando solicitudes…' : 'Cargar siguientes 50 solicitudes'}
                        </button>
                    </div>
                )}

                {/* ANIMACIÓN Y PANEL DE EDICIÓN DE INFORMACIÓN OBTENIDA */}
                {buscando && (
                    <div className="p-8 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-col items-center justify-center space-y-3 animate-pulse">
                        <Icon icon="lucide:search" className="text-3xl text-indigo-600 animate-bounce" />
                        <p className="text-sm font-semibold text-indigo-900">
                            Analizando y recuperando información del modelo &quot;{peticionSeleccionada?.modelo}&quot;...
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
                                <label className="block text-xs font-medium text-gray-800 mb-1">Modelo</label>
                                <input
                                    type="text"
                                    value={formEditable.modelo}
                                    onChange={e => setFormEditable({ ...formEditable, modelo: e.target.value })}
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm text-gray-800 placeholder:text-gray-800 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-800 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={formEditable.nombre}
                                    onChange={e => setFormEditable({ ...formEditable, nombre: e.target.value })}
                                    placeholder="Ej. MODELO BASE COSTURA"
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm text-gray-800 placeholder:text-gray-800 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-800 mb-1">Código (Producto)</label>
                                <input
                                    type="text"
                                    value={formEditable.codigo}
                                    onChange={e => setFormEditable({ ...formEditable, codigo: e.target.value })}
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm text-gray-800 placeholder:text-gray-800 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-800 mb-1">Producto (Descripción)</label>
                                <input
                                    type="text"
                                    value={formEditable.nombre_secundario}
                                    onChange={e => setFormEditable({ ...formEditable, nombre_secundario: e.target.value })}
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm text-gray-800 placeholder:text-gray-800 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-800 mb-1">Costura</label>
                                <input
                                    type="text"
                                    value={formEditable.costura}
                                    onChange={e => setFormEditable({ ...formEditable, costura: e.target.value })}
                                    placeholder="Ej. 1"
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm text-gray-800 placeholder:text-gray-800 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-800 mb-1">Tiempo (segundos por unidad)</label>
                                <input
                                    type="text"
                                    value={formEditable.tiempo}
                                    onChange={e => setFormEditable({ ...formEditable, tiempo: e.target.value })}
                                    placeholder="Ej. 120"
                                    className="w-full border border-gray-200 bg-white p-2.5 rounded-xl text-sm text-gray-800 placeholder:text-gray-800 focus:outline-none focus:border-indigo-500"
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
                            accept=".xltx, .xlsx, .xls, .csv"
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
                                    <p className="text-xs text-gray-400 mt-1">Formatos soportados: .xltx, .xlsx, .xls, .csv. El archivo Productos carga código, descripción y tiempo de costura en segundos.</p>
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
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-800">Catálogo editable</h2>
                        <p className="text-xs text-slate-500">Edita directamente las celdas; cada cambio se guarda al salir del campo. Los campos de tiempo se capturan en segundos.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input value={busquedaCatalogo} onChange={event => setBusquedaCatalogo(event.target.value)} placeholder="Buscar por código de proceso..." className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-700 outline-none focus:border-indigo-400" />
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><Icon icon="lucide:cloud-check" className="text-emerald-600" /> Guardado automático</span>
                    </div>
                </div>
                {estadoCatalogo && <div role="status" className={`border-b px-4 py-2 text-sm ${estadoCatalogo.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{estadoCatalogo.message}</div>}

                {loadingProductos ? <SewingLoader message="Cargando catálogo de tiempos" compact /> : (
                    <div className="overflow-auto">
                        <table className="min-w-[1900px] border-collapse text-left text-xs">
                            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600">
                                <tr>
                                    <th className="sticky left-0 z-20 border-b border-r border-slate-200 bg-slate-100 px-3 py-3">Estado</th>
                                    {CAMPOS_PRODUCTO.map(({ key, label }) => <th key={String(key)} className="border-b border-r border-slate-200 px-3 py-2 font-semibold"><FilterHeaderModal title={label} fieldKey={String(key)} /></th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="bg-indigo-50/70">
                                    <td className="sticky left-0 border-b border-r border-slate-200 bg-indigo-50 px-3 py-2">
                                        <button type="button" onClick={agregarProducto} disabled={guardandoProducto || !nuevoProducto.cod_proceso.trim() || !nuevoProducto.descripcion.trim()} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 font-semibold text-white disabled:opacity-40"><Icon icon="lucide:plus" /> Agregar</button>
                                    </td>
                                    {CAMPOS_PRODUCTO.map(({ key, label, numeric }) => <td key={String(key)} className="border-b border-r border-slate-200 p-1"><input aria-label={`Nuevo ${label}`} type={numeric ? 'number' : 'text'} min={numeric ? 0 : undefined} step={numeric ? 'any' : undefined} value={nuevoProducto[String(key)] ?? ''} onChange={event => setNuevoProducto(current => ({ ...current, [String(key)]: event.target.value }))} placeholder={label} className="w-full min-w-28 rounded border border-indigo-100 bg-white px-2 py-2 text-gray-700 placeholder:text-gray-700 outline-none focus:border-indigo-400" /></td>)}
                                </tr>
                                {productosFiltrados.map((producto, index) => {
                                    const id = Number(producto.id)
                                    const borrador: Record<string, string> = borradoresProductos[id] || {}
                                    const tieneCambios = CAMPOS_PRODUCTO.some(({ key }) => String(producto[key] ?? '') !== String(borrador[String(key)] ?? producto[key] ?? ''))
                                    return (
                                        <tr key={producto.id ?? index} className={`group ${index % 2 ? 'bg-slate-50/60' : 'bg-white'} hover:bg-indigo-50/40`}>
                                            <td className="sticky left-0 border-b border-r border-slate-200 bg-inherit px-3 py-1.5">
                                                <span aria-label={tieneCambios ? 'Cambio pendiente de guardar' : 'Fila guardada'} title={tieneCambios ? 'Cambio pendiente de guardar' : 'Fila guardada'} className={`rounded-md p-2 ${tieneCambios ? 'text-amber-500' : 'text-emerald-600'}`}><Icon icon={tieneCambios ? 'lucide:cloud-upload' : 'lucide:cloud-check'} /></span>
                                            </td>
                                            {CAMPOS_PRODUCTO.map(({ key, label, numeric }) => <td key={String(key)} className="border-b border-r border-slate-200 p-1"><input aria-label={`${label}, ${producto.cod_proceso ?? ''}`} type={numeric ? 'number' : 'text'} min={numeric ? 0 : undefined} step={numeric ? 'any' : undefined} value={borrador[String(key)] ?? String(producto[key] ?? '')} onChange={event => actualizarCelda(producto, String(key), event.target.value)} onBlur={() => { if (tieneCambios && producto.id) void guardarProducto(Number(producto.id)) }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} disabled={guardandoProducto} placeholder={label} className="w-full min-w-28 rounded border border-transparent bg-transparent px-2 py-2 text-gray-700 placeholder:text-gray-700 outline-none hover:border-slate-200 focus:border-indigo-400 focus:bg-white disabled:opacity-70" /></td>)}
                                        </tr>
                                    )
                                })}
                                {!productosFiltrados.length && <tr><td colSpan={CAMPOS_PRODUCTO.length + 1} className="p-8 text-center text-slate-400">No hay productos que coincidan con la búsqueda o los filtros.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loadingProductos && hasMore && <div className="flex justify-center border-t border-slate-100 p-4"><button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">{loadingMore ? 'Cargando…' : 'Cargar siguientes 50 productos'}</button></div>}
            </section>
        </div>
    )
}
