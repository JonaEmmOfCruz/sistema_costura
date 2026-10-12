'use client'
import { useEffect, useRef, useState } from "react"
import { Icon } from "@iconify/react"
import useRealtimeRefresh from "@/lib/useRealtimeRefresh"
import useLatestRequest from "@/lib/useLatestRequest"

const PREFIJOS_PRIORITARIOS = [
    "103-070", "103-046", "202-070", "102-070", "102-020",
    "102-019", "102-160", "102-139", "102-137", "102-136",
    "202-136", "102-135", "102-132", "202-013", "102-110",
    "202-110", "202-137", "101-002"
]

const esOrdenPrioritaria = (asignacion: { producto?: string | null; nombre?: string | null } | null | undefined) => PREFIJOS_PRIORITARIOS.some((prefijo) =>
    String(asignacion?.producto || '').trim().startsWith(prefijo) ||
    String(asignacion?.nombre || '').trim().startsWith(prefijo)
)

export default function OperadorPage() {
    const [user, setUser] = useState<any>(null)
    const [asignacion, setAsignacion] = useState<any | null>(null)
    const [asignacionesBloqueadas, setAsignacionesBloqueadas] = useState<any[]>([])
    const [mostrarAlerta, setMostrarAlerta] = useState(false)
    const [alertaCambioPrioritario, setAlertaCambioPrioritario] = useState(false)
    const [segundos, setSegundos] = useState<number>(0)
    const [costuraActiva, setCosturaActiva] = useState(false)
    const [loadingTerminar, setLoadingTerminar] = useState(false)
    const asignacionActivaId = useRef<number | null>(null)
    const asignacionAnteriorRef = useRef<{ id: number; esPrioritaria: boolean } | null>(null)
    const isLatestRequest = useLatestRequest()

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
        const esUltimaSolicitud = isLatestRequest('manual')
        const codigoProducto = asignacion?.producto || asignacion?.nombre

        if (!codigoProducto) {
            setManual(null)
            return
        }
        const buscarManualPorProducto = async () => {
            try {
                const res = await fetch(`/api/manuales?codigo=${encodeURIComponent(codigoProducto)}`, { cache: 'no-store' })
                const data = await res.json()

                if (!esUltimaSolicitud()) return
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
                if (esUltimaSolicitud()) setManual(null)
            }
        }

        buscarManualPorProducto()
    }, [asignacion?.producto, asignacion?.nombre, isLatestRequest])

    const cargarAsignacionPendiente = async (idOperador: number) => {
        const esUltimaSolicitud = isLatestRequest('asignacion')
        try {
            const res = await fetch(`/api/operador/asignaciones?id_operador=${idOperador}`, { cache: 'no-store' })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()

            if (!esUltimaSolicitud()) return
            if (data.success && Array.isArray(data.asignaciones)) {
                const activa = data.asignaciones.find((item: any) => item.estatus === 'asignado' || item.estatus == null) || null
                const bloqueadas = data.asignaciones.filter((item: any) => item.estatus === 'pausado')
                setAsignacionesBloqueadas(bloqueadas)

                if (activa) {
                    const esNuevaAsignacion = asignacionActivaId.current !== activa.id
                    const prioridadActual = esOrdenPrioritaria(activa)
                    const asignacionAnterior = asignacionAnteriorRef.current
                    const cambioAOrdenPrioritaria = Boolean(
                        asignacionAnterior &&
                        asignacionAnterior.id !== activa.id &&
                        !asignacionAnterior.esPrioritaria &&
                        prioridadActual
                    )
                    asignacionActivaId.current = activa.id
                    asignacionAnteriorRef.current = { id: activa.id, esPrioritaria: prioridadActual }
                    setAsignacion(activa)

                    const inicioSesion = Number(activa.inicio_sesion_ms) || 0
                    const segundosAcumulados = Number(activa.segundos_acumulados) || 0
                    const segundosEnSesion = inicioSesion
                        ? Math.max(0, Math.floor((Date.now() - inicioSesion) / 1000))
                        : 0

                    setSegundos(segundosAcumulados + segundosEnSesion)
                    setCosturaActiva(inicioSesion > 0)
                    setAlertaCambioPrioritario(cambioAOrdenPrioritaria)
                    setMostrarAlerta(cambioAOrdenPrioritaria || (esNuevaAsignacion && inicioSesion === 0))
                } else {
                    asignacionActivaId.current = null
                    asignacionAnteriorRef.current = null
                    setAsignacion(null)
                    setCosturaActiva(false)
                    setSegundos(0)
                    setMostrarAlerta(false)
                    setAlertaCambioPrioritario(false)
                }
            } else {
                setAsignacion(null)
                setAsignacionesBloqueadas([])
                asignacionActivaId.current = null
                asignacionAnteriorRef.current = null
                setCosturaActiva(false)
                setSegundos(0)
                setMostrarAlerta(false)
                setAlertaCambioPrioritario(false)
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
    const asignacionEsPrioritaria = asignacion ? esOrdenPrioritaria(asignacion) : false

    return (
        <div className="min-h-[calc(100vh-4rem)] w-full box-border bg-slate-100 px-3 py-4 sm:px-6">
            {mostrarAlerta && asignacion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true">
                    <div className="w-full max-w-md animate-in fade-in zoom-in rounded-2xl bg-white p-6 text-center shadow-2xl">
                        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${alertaCambioPrioritario ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <Icon icon={alertaCambioPrioritario ? "lucide:triangle-alert" : "lucide:bell"} className="text-2xl" />
                        </div>
                        <p className={`mb-1 text-xs font-bold uppercase tracking-[0.18em] ${alertaCambioPrioritario ? 'text-red-600' : 'text-blue-600'}`}>
                            {alertaCambioPrioritario ? 'Cambio de prioridad' : 'Nueva asignación'}
                        </p>
                        <h2 className="text-xl font-bold text-slate-900">
                            {alertaCambioPrioritario ? 'Se activó una orden prioritaria' : 'Nueva orden asignada'}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {alertaCambioPrioritario
                                ? 'La orden prioritaria pasa a ser tu tarea activa. Tu OP normal quedó pausada y su tiempo se guardó.'
                                : 'Se te asignó una nueva tarea de costura.'}
                        </p>

                        <div className="my-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">OP activa</span>
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${alertaCambioPrioritario ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {alertaCambioPrioritario ? 'Prioritaria' : 'Nueva'}
                                </span>
                            </div>
                            <p className="mt-1 text-lg font-bold text-slate-900">{asignacion.op}</p>
                            <p className="mt-1 text-sm text-slate-600">{asignacion.producto || asignacion.nombre}</p>
                            <p className="mt-3 text-sm font-semibold text-slate-700">{asignacion.cantidad_asignada} unidades</p>
                        </div>

                        <button
                            onClick={() => setMostrarAlerta(false)}
                            className={`w-full rounded-xl py-3 font-semibold text-white transition-colors ${alertaCambioPrioritario ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            Entendido, ver orden activa
                        </button>
                    </div>
                </div>
            )}

            <main className="mx-auto flex w-full max-w-5xl flex-col gap-3">
                {asignacion && (
                    <section aria-label="Orden activa" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className={`h-1.5 w-full ${asignacionEsPrioritaria ? 'bg-red-500' : 'bg-blue-600'}`} />
                        <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${asignacionEsPrioritaria ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <Icon icon="lucide:scissors" className="text-lg" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${asignacionEsPrioritaria ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                            {asignacionEsPrioritaria ? 'OP prioritaria activa' : 'OP activa'}
                                        </span>
                                        <span className="text-xs font-mono text-slate-500">OP <strong className="text-slate-800">{asignacion.op}</strong></span>
                                        <span className="text-xs font-mono text-slate-500">RQ <strong className="text-slate-800">{asignacion.rq}</strong></span>
                                    </div>
                                    <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">{asignacion.producto || asignacion.nombre}</h1>
                                    {asignacion.nombre && asignacion.nombre !== asignacion.producto && (
                                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{asignacion.nombre}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 items-stretch gap-2 sm:flex sm:items-center">
                                <div className="flex min-w-[86px] flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Cantidad</span>
                                    <span className="text-lg font-bold text-blue-700">{asignacion.cantidad_asignada}</span>
                                </div>
                                <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-center text-slate-800 sm:min-w-[150px]">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-indigo-600">Tiempo sugerido</p>
                                    <p className={`mt-0.5 font-mono font-bold leading-none tabular-nums text-indigo-950 ${Number(asignacion.tiempo_sugerido_segundos) > 0 ? 'text-xl sm:text-2xl' : 'text-xs'}`}>
                                        {Number(asignacion.tiempo_sugerido_segundos) > 0
                                            ? formatTiempo(Number(asignacion.tiempo_sugerido_segundos))
                                            : 'Sin métrica'}
                                    </p>
                                </div>
                                <div className={`col-span-2 rounded-xl border px-4 py-2 text-center sm:col-span-1 sm:min-w-[150px] ${costuraActiva ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-800'}`}>
                                    <p className={`text-[9px] font-bold uppercase tracking-[0.16em] ${costuraActiva ? 'text-emerald-300' : 'text-slate-400'}`}>
                                        {costuraActiva ? 'Tiempo activo' : 'Tiempo acumulado'}
                                    </p>
                                    <p className="mt-0.5 font-mono text-3xl font-bold leading-none tabular-nums sm:text-4xl">{formatTiempo(segundos)}</p>
                                </div>
                                {!costuraActiva ? (
                                    <button
                                        onClick={iniciarCostura}
                                        className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:col-span-1"
                                    >
                                        <Icon icon="lucide:play" /> Iniciar
                                    </button>
                                ) : (
                                    <button
                                        onClick={terminarCostura}
                                        disabled={loadingTerminar}
                                        className="col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 sm:col-span-1"
                                    >
                                        {loadingTerminar ? <Icon icon="lucide:loader-2" className="animate-spin" /> : <Icon icon="lucide:check-circle-2" />}
                                        Terminar
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {!asignacion && asignacionesBloqueadas.length > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                        <Icon icon="lucide:clock-3" className="shrink-0 text-lg text-amber-600" />
                        No tienes una OP activa en este momento. Tus órdenes pausadas conservan su tiempo acumulado.
                    </div>
                )}

                {asignacionesBloqueadas.length > 0 && (
                    <section aria-label="Órdenes pausadas" className="space-y-2">
                        {asignacionesBloqueadas.map((bloqueada) => (
                            <article key={bloqueada.id} className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-3 sm:px-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-700">
                                            <Icon icon="lucide:lock-keyhole" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">OP pausada</span>
                                                <span className="text-xs font-mono text-slate-500">OP <strong className="text-slate-700">{bloqueada.op}</strong></span>
                                            </div>
                                            <p className="truncate text-sm font-semibold text-slate-800">{bloqueada.producto || bloqueada.nombre}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 border-t border-amber-200/70 pt-2 sm:justify-end sm:border-0 sm:pt-0">
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">Sugerido</p>
                                            <p className="font-mono text-sm font-bold tabular-nums text-indigo-950">
                                                {Number(bloqueada.tiempo_sugerido_segundos) > 0
                                                    ? formatTiempo(Number(bloqueada.tiempo_sugerido_segundos))
                                                    : 'Sin métrica'}
                                            </p>
                                        </div>
                                        <span className="text-xs text-slate-500">{bloqueada.cantidad_asignada} unidades</span>
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Tiempo guardado</p>
                                            <p className="font-mono text-xl font-bold tabular-nums text-slate-800">{formatTiempo(Number(bloqueada.segundos_acumulados) || 0)}</p>
                                        </div>
                                        <Icon icon="lucide:timer-off" className="text-xl text-amber-600" />
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                )}

                {asignacion && (
                    <section aria-label="Manual de operación" className="flex min-h-[68vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <h2 className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-700">
                                <Icon icon="lucide:file-text" className="shrink-0 text-base text-blue-600" />
                                <span className="shrink-0">Manual de Operación</span>
                                <span className="truncate font-normal text-slate-500">{manual ? manual.nombre : 'Sin manual detectado'}</span>
                            </h2>
                            {manual?.ruta && (
                                <a
                                    href={manual.ruta}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 sm:self-auto"
                                >
                                    <Icon icon="lucide:external-link" /> Pantalla completa
                                </a>
                            )}
                        </div>

                        <div className="flex flex-1 flex-col bg-slate-50/70 p-3 sm:p-4">
                            {manual?.ruta ? (
                                <div className="flex min-h-[62vh] flex-1 flex-col overflow-auto rounded-xl border border-slate-200 bg-white shadow-inner">
                                    {manual.tipo?.includes('image') ? (
                                        <div className="flex min-h-[62vh] w-full flex-1 items-center justify-center p-3 sm:p-5">
                                            <img src={manual.ruta} alt="Manual de producción" className="h-auto max-h-full w-full object-contain" />
                                        </div>
                                    ) : (
                                        <iframe src={`${manual.ruta}#view=FitH`} className="min-h-[62vh] w-full flex-1 border-0" title="Manual PDF" />
                                    )}
                                </div>
                            ) : (
                                <div className="flex min-h-[62vh] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                                    <Icon icon="lucide:file-question" className="mb-3 text-4xl text-slate-300" />
                                    <p className="text-sm font-semibold text-slate-700">No hay manual vinculado para este producto</p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        No se encontró un archivo que coincida con la clave <strong>&quot;{codigoSegundoString}&quot;</strong> del producto.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}