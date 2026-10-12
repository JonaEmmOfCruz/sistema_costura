'use client'
import { useEffect, useRef, useState } from "react"
import { Icon } from "@iconify/react"
import useRealtimeRefresh from "@/lib/useRealtimeRefresh"

const PREFIJOS_PRIORITARIOS = [
    "103-070", "103-046", "202-070", "102-070", "102-020",
    "102-019", "102-160", "102-139", "102-137", "102-136",
    "202-136", "102-135", "102-132", "202-013", "102-110",
    "202-110", "202-137", "101-002"
]

export default function OperadorPage() {
    const [user, setUser] = useState<any>(null)
    const [asignacion, setAsignacion] = useState<any | null>(null)
    const [asignacionesBloqueadas, setAsignacionesBloqueadas] = useState<any[]>([])
    const [mostrarAlerta, setMostrarAlerta] = useState(false)
    const [segundos, setSegundos] = useState<number>(0)
    const [costuraActiva, setCosturaActiva] = useState(false)
    const [loadingTerminar, setLoadingTerminar] = useState(false)
    const asignacionActivaId = useRef<number | null>(null)

    // Estado para almacenar los datos del manual encontrado
    const [manual, setManual] = useState<{
        ruta: string
        tipo: string
        nombre: string
    } | null>(null)

    // 1. Obtenemos la sesión del usuario actual
    useEffect(() => {
        const obtenerUsuario = async () => {
            try {
                const res = await fetch('/api/me')
                const data = await res.json()
                if (data.success && data.user) {
                    setUser(data.user)
                }
            } catch (error) {
                console.error("Error al obtener usuario:", error)
            }
        }
        obtenerUsuario()
    }, [])

    // Las asignaciones se actualizan en vivo mediante eventos del servidor.
    useEffect(() => {
        if (!user?.id) return

        cargarAsignacionPendiente(user.id)

    }, [user?.id])

    useRealtimeRefresh(() => {
        if (user?.id) {
            return cargarAsignacionPendiente(user.id)
        }
    })

    // 3. Evaluar el producto asignado para buscar su manual
    useEffect(() => {
        const codigoProducto = asignacion?.producto || asignacion?.nombre

        if (!codigoProducto) {
            setManual(null)
            return
        }

        const buscarManualPorProducto = async () => {
            try {
                const res = await fetch(`/api/manuales?codigo=${encodeURIComponent(codigoProducto)}`)
                const data = await res.json()

                if (data.success && data.manuales && data.manuales.length > 0) {
                    const manualEncontrado = data.manuales[0]
                    setManual({
                        ruta: manualEncontrado.ruta,
                        tipo: manualEncontrado.tipo,
                        nombre: manualEncontrado.nombre_original
                    })
                } else {
                    setManual(null)
                }
            } catch (error) {
                console.error("Error al buscar el manual para el producto:", error)
                setManual(null)
            }
        }

        buscarManualPorProducto()
    }, [asignacion?.producto, asignacion?.nombre])

    const cargarAsignacionPendiente = async (idOperador: number) => {
        try {
            const res = await fetch(`/api/operador/asignaciones?id_operador=${idOperador}`, { cache: 'no-store' })
            const data = await res.json()

            if (data.success && Array.isArray(data.asignaciones)) {
                const activa = data.asignaciones.find((item: any) => item.estatus === 'asignado' || item.estatus == null) || null
                const bloqueadas = data.asignaciones.filter((item: any) => item.estatus === 'pausado')
                setAsignacionesBloqueadas(bloqueadas)

                if (activa) {
                    const esNuevaAsignacion = asignacionActivaId.current !== activa.id
                    asignacionActivaId.current = activa.id
                    setAsignacion(activa)

                    const inicioSesion = Number(activa.inicio_sesion_ms) || 0
                    const segundosAcumulados = Number(activa.segundos_acumulados) || 0
                    const segundosEnSesion = inicioSesion
                        ? Math.max(0, Math.floor((Date.now() - inicioSesion) / 1000))
                        : 0

                    setSegundos(segundosAcumulados + segundosEnSesion)
                    setCosturaActiva(inicioSesion > 0)
                    setMostrarAlerta(esNuevaAsignacion && inicioSesion === 0)
                } else {
                    asignacionActivaId.current = null
                    setAsignacion(null)
                    setCosturaActiva(false)
                    setSegundos(0)
                    setMostrarAlerta(false)
                }
            } else {
                setAsignacion(null)
                setAsignacionesBloqueadas([])
                asignacionActivaId.current = null
                setCosturaActiva(false)
                setSegundos(0)
                setMostrarAlerta(false)
            }
        } catch (error) {
            console.error("Error al cargar asignación:", error)
        }
    }

    // El temporizador se calcula desde los intervalos persistidos en la base de datos.
    useEffect(() => {
        if (!costuraActiva || !asignacion) return

        const actualizarTemporizador = () => {
            const inicioSesion = Number(asignacion.inicio_sesion_ms) || 0
            const segundosAcumulados = Number(asignacion.segundos_acumulados) || 0
            const segundosEnSesion = inicioSesion
                ? Math.max(0, Math.floor((Date.now() - inicioSesion) / 1000))
                : 0
            setSegundos(segundosAcumulados + segundosEnSesion)
        }

        actualizarTemporizador()
        const intervalo = window.setInterval(actualizarTemporizador, 1000)
        return () => window.clearInterval(intervalo)
    }, [
        asignacion?.id,
        asignacion?.inicio_sesion_ms,
        asignacion?.segundos_acumulados,
        costuraActiva
    ])

    const iniciarCostura = async () => {
        if (!asignacion) return
        try {
            const res = await fetch('/api/operador/costura/iniciar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asignacion_id: asignacion.id })
            })
            const data = await res.json()
            if (data.success) {
                if (user?.id) await cargarAsignacionPendiente(user.id)
            } else {
                alert(data.message || 'No se pudo iniciar el temporizador.')
            }
        } catch (error) {
            console.error("Error al iniciar:", error)
        }
    }

    // Función para terminar la orden y registrar el tiempo transcurrido
    const terminarCostura = async () => {
        if (!asignacion) return
        setLoadingTerminar(true)

        try {
            const fechaFinActual = new Date().toISOString()

            const res = await fetch('/api/costura-tiempos/terminar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_asignacion: asignacion.id,
                    asignacion_id: asignacion.id,
                    fecha_fin: fechaFinActual,
                    tiempo_segundos: segundos,
                    tipo: 'operador'
                })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setCosturaActiva(false)
                setSegundos(0)
                setAsignacion(null)
                setManual(null)

                if (user && user.id) {
                    await cargarAsignacionPendiente(user.id)
                }
            } else {
                alert(data.message || 'Ocurrió un error al intentar terminar la orden.')
            }
        } catch (error) {
            console.error("Error al terminar la orden:", error)
            alert('Error de conexión al terminar la orden.')
        } finally {
            setLoadingTerminar(false)
        }
    }

    // Formateador de tiempo a HH:MM:SS o MM:SS
    const formatTiempo = (seg: number) => {
        const h = Math.floor(seg / 3600)
        const m = Math.floor((seg % 3600) / 60).toString().padStart(2, '0')
        const s = (seg % 60).toString().padStart(2, '0')
        return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                 <span className="text-sm font-medium animate-pulse">Verificando tareas...</span>
            </div>
        )
    }

    if (!asignacion && !asignacionesBloqueadas.length && !mostrarAlerta) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Icon icon="lucide:check-circle-2" className="text-6xl mb-4 text-slate-300" />
                <p>No tienes asignaciones pendientes en este momento.</p>
                <p className="text-xs text-slate-400 mt-2">Buscando nuevas tareas automáticamente...</p>
            </div>
        )
    }

    const textoProducto = asignacion?.producto || asignacion?.nombre || ''
    const partesProducto = textoProducto.split('-')
    const codigoSegundoString = partesProducto.length >= 2 ? partesProducto[1].trim() : textoProducto.trim()
    const asignacionEsPrioritaria = asignacion && PREFIJOS_PRIORITARIOS.some((prefijo) =>
        String(asignacion.producto || '').trim().startsWith(prefijo) ||
        String(asignacion.nombre || '').trim().startsWith(prefijo)
    )

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col box-border bg-slate-50 p-4 gap-4">
            {/* Modal de Nueva Asignación */}
            {mostrarAlerta && asignacion && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in duration-200">
                        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <Icon icon="lucide:bell" className="text-blue-600 text-xl" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-1">Nueva Orden Asignada</h2>
                        <p className="text-slate-500 text-sm mb-6">Se te ha asignado una nueva tarea de costura.</p>
                        
                        <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left border border-slate-100">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">OP</p>
                            <p className="font-medium text-slate-800 mb-3">{asignacion.op}</p>
                            
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Producto</p>
                            <p className="font-medium text-slate-800 mb-3">{asignacion.producto || asignacion.nombre}</p>
                            
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Cantidad Asignada</p>
                            <p className="font-medium text-blue-600 text-lg">{asignacion.cantidad_asignada} unidades</p>
                        </div>
                        
                        <button 
                            onClick={() => setMostrarAlerta(false)}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                        >
                            Aceptar y Ver Detalles
                        </button>
                    </div>
                </div>
            )}

            {!mostrarAlerta && asignacion && (
                <>
                    {/* FILA SUPERIOR: Panel de Información */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:flex-row items-stretch justify-between p-5 gap-4 w-full">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Icon icon="lucide:scissors" className="text-xl" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${asignacionEsPrioritaria ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                        {asignacionEsPrioritaria ? 'Orden prioritaria activa' : 'Tarea actual'}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono">OP: <strong className="text-slate-700">{asignacion.op}</strong></span>
                                    <span className="text-xs text-slate-400 font-mono">RQ: <strong className="text-slate-700">{asignacion.rq}</strong></span>
                                </div>
                                <h2 className="text-base font-bold text-slate-800">{asignacion.producto || asignacion.nombre}</h2>
                                <p className="text-xs text-slate-500">{asignacion.nombre}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60 text-center">
                                <p className="text-[10px] uppercase font-semibold text-slate-400">Cantidad</p>
                                <p className="text-lg font-bold text-blue-600">{asignacion.cantidad_asignada}</p>
                            </div>

                            <div className={`px-5 py-3 rounded-2xl border text-center min-w-[190px] ${costuraActiva ? 'bg-slate-950 border-slate-800 text-white shadow-lg shadow-slate-900/15' : 'bg-slate-50 border-slate-200/60 text-slate-700'}`}>
                                <p className={`text-[10px] uppercase font-bold tracking-[0.18em] ${costuraActiva ? 'text-emerald-300' : 'text-slate-400'}`}>
                                    {costuraActiva ? 'Cronómetro en marcha' : 'Tiempo acumulado'}
                                </p>
                                <p className={`text-3xl sm:text-4xl leading-none mt-1 font-mono font-bold tabular-nums ${costuraActiva ? 'text-white' : 'text-slate-700'}`}>
                                    {formatTiempo(segundos)}
                                </p>
                            </div>

                            <div>
                                {!costuraActiva ? (
                                    <button 
                                        onClick={iniciarCostura}
                                        className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold transition-all shadow-md flex items-center gap-2 text-sm"
                                    >
                                        <Icon icon="lucide:play" className="text-base" />
                                        Iniciar
                                    </button>
                                ) : (
                                    <button 
                                        onClick={terminarCostura}
                                        disabled={loadingTerminar}
                                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
                                    >
                                        {loadingTerminar ? (
                                            <Icon icon="lucide:loader-2" className="text-base animate-spin" />
                                        ) : (
                                            <Icon icon="lucide:check-circle-2" className="text-base" />
                                        )}
                                        <span>Terminar</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FILA INFERIOR: Visualización del Manual */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full flex-1 min-h-[75vh]">
                        <div className="border-b border-slate-100 px-6 py-3.5 flex items-center justify-between shrink-0 w-full">
                            <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                                <Icon icon="lucide:file-text" className="text-blue-600 text-base" />
                                Manual de Operación: <span className="text-slate-500 font-normal">{manual ? manual.nombre : 'Sin manual detectado'}</span>
                            </h3>
                            {manual?.ruta && (
                                <a 
                                    href={manual.ruta} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
                                >
                                    <Icon icon="lucide:external-link" /> Pantalla completa
                                </a>
                            )}
                        </div>

                        <div className="p-4 flex flex-col bg-slate-50/50 w-full flex-1">
                            {manual?.ruta ? (
                                <div className="bg-white rounded-xl overflow-auto border border-slate-200 w-full flex-1 min-h-[70vh] flex flex-col relative shadow-inner">
                                    {manual.tipo?.includes('image') ? (
                                        <div className="w-full h-full flex items-center justify-center p-4">
                                            <img 
                                                src={manual.ruta} 
                                                alt="Manual de producción" 
                                                className="w-full h-auto object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <iframe 
                                            src={`${manual.ruta}#view=FitH`} 
                                            className="w-full h-full min-h-[75vh] border-0"
                                            title="Manual PDF"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="w-full h-[50vh] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white p-6 text-center">
                                    <Icon icon="lucide:file-question" className="text-4xl mb-2 text-slate-300" />
                                    <p className="text-sm font-medium text-slate-600">No hay manual vinculado para este producto</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        No se encontró un archivo que coincida con la clave <strong>"{codigoSegundoString}"</strong> del producto.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {!mostrarAlerta && asignacionesBloqueadas.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-amber-800">
                        <Icon icon="lucide:shield-alert" className="text-lg" />
                        <h2 className="text-sm font-bold uppercase tracking-wider">Trabajo bloqueado temporalmente</h2>
                    </div>
                    <p className="text-xs text-slate-500">
                        Esta OP normal quedó pausada mientras atiendes la orden prioritaria. Su tiempo está guardado y detenido; podrás reanudarlo cuando vuelva a estar activa.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {asignacionesBloqueadas.map((bloqueada) => (
                            <article
                                key={bloqueada.id}
                                className="relative overflow-hidden rounded-2xl border border-amber-300 bg-white shadow-sm"
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,251,235,0.92),rgba(255,255,255,0.97))]" />
                                <div className="relative p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                                <Icon icon="lucide:lock-keyhole" />
                                                Bloqueada por prioridad
                                            </span>
                                            <h3 className="mt-3 text-xl font-bold text-slate-800">OP: {bloqueada.op}</h3>
                                            <p className="mt-1 text-sm text-slate-600">{bloqueada.producto || bloqueada.nombre}</p>
                                            <p className="text-xs text-slate-500">{bloqueada.nombre}</p>
                                        </div>
                                        <div className="shrink-0 rounded-xl border border-amber-200 bg-white/90 px-3 py-2 text-right">
                                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Cantidad</p>
                                            <p className="text-lg font-bold text-amber-700">{bloqueada.cantidad_asignada} u.</p>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white/90 px-4 py-3">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Tiempo guardado</p>
                                            <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-slate-800">
                                                {formatTiempo(Number(bloqueada.segundos_acumulados) || 0)}
                                            </p>
                                        </div>
                                        <Icon icon="lucide:timer-off" className="text-3xl text-amber-500" />
                                    </div>
                                    <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
                                        <Icon icon="lucide:pause-circle" />
                                        Temporizador detenido mientras está pausada
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}