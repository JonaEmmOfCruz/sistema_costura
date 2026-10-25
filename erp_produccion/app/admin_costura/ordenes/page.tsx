'use client'
import { useEffect, useRef, useState } from "react"
import { Icon } from "@iconify/react"
import ReusableTable from "@/components/ReusableTable"
import useRealtimeRefresh from "@/lib/useRealtimeRefresh"
import useLatestRequest from "@/lib/useLatestRequest"

const PREFIJOS_PRIORITARIOS = [
    "101-002", "101-006", "101-183", "101-320", "102-008",
    "102-011", "102-013", "102-019", "102-020", "102-070",
    "102-110", "102-132", "102-136", "102-137", "102-139",
    "102-160", "103-045", "103-046", "103-070", "104-019",
    "104-051", "104-070", "108-007", "108-078", "108-079",
    "110-378", "112-136", "202-020", "202-160"
];

const MOTIVOS_ESPERA = ['No hay tela', 'Problema de calidad', 'Cambio de fecha'] as const

function TiempoCorte({
    inicioMs,
    segundosIniciales,
    segundosRef,
}: {
    inicioMs: number | null
    segundosIniciales: number
    segundosRef: { current: number }
}) {
    const [segundos, setSegundos] = useState(segundosIniciales)

    useEffect(() => {
        if (!inicioMs) {
            segundosRef.current = segundosIniciales
            setSegundos(segundosIniciales)
            return
        }

        const actualizar = () => {
            const valor = Math.max(0, Math.floor((Date.now() - inicioMs) / 1000))
            segundosRef.current = valor
            setSegundos(valor)
        }
        actualizar()
        const intervalo = window.setInterval(actualizar, 1000)
        return () => window.clearInterval(intervalo)
    }, [inicioMs, segundosIniciales, segundosRef])

    const minutos = Math.floor(segundos / 60)
    const segundosRestantes = segundos % 60
    return <span className="text-3xl font-mono font-bold">{`${minutos.toString().padStart(2, '0')}:${segundosRestantes.toString().padStart(2, '0')}`}</span>
}

const esPrioritario = (row: any) => {
    const textoProducto = String(row.producto || '').trim();
    const textoNombre = String(row.nombre || '').trim();

    return PREFIJOS_PRIORITARIOS.some(prefijo => 
        textoProducto.startsWith(prefijo) || textoNombre.startsWith(prefijo)
    );
};

// Ilustración estática de construcción de silla.
function AnimacionArmadoSilla() {
    return (
        <div className="flex items-center justify-center h-10 w-full overflow-hidden">
            <svg viewBox="0 0 400 120" className="h-full w-auto">
                {/* 1. Base / Ruedas */}
                <g className="anim-base">
                    <ellipse cx="200" cy="105" rx="35" ry="6" fill="#cbd5e1" />
                    <circle cx="165" cy="107" r="4" fill="#334155" />
                    <circle cx="235" cy="107" r="4" fill="#334155" />
                    <circle cx="200" cy="109" r="4" fill="#334155" />
                    <path d="M165 105 L200 95 L235 105" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
                </g>

                {/* 2. Pistón */}
                <g className="anim-piston">
                    <rect x="196" y="75" width="8" height="22" rx="2" fill="#0f172a" />
                    <rect x="198" y="70" width="4" height="10" fill="#94a3b8" />
                </g>

                {/* 3. Asiento */}
                <g className="anim-asiento">
                    <rect x="170" y="62" width="60" height="10" rx="4" fill="#2563eb" />
                </g>

                {/* 4. Respaldo */}
                <g className="anim-respaldo">
                    <path d="M175 62 L175 25 Q175 18 182 18 L218 18 Q225 18 225 25 L225 62" fill="#3b82f6" />
                    <rect x="183" y="25" width="34" height="30" rx="3" fill="#60a5fa" opacity="0.6" />
                </g>

                {/* 5. Descansabrazos */}
                <g className="anim-brazos">
                    <path d="M167 60 L167 45 L175 45" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M233 60 L233 45 L225 45" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </g>

                {/* 6. Destello cuando termina de armarse */}
                <g className="anim-destello">
                    <path d="M200 10 L203 20 L213 23 L203 26 L200 36 L197 26 L187 23 L197 20 Z" fill="#f59e0b" />
                </g>
            </svg>
        </div>
    );
}

export default function AdminCosturaOrdenesPage() {
    const [loading, setLoading] = useState(false)
    const [ordenes, setOrdenes] = useState<any[]>([])
    const [ordenesEnEspera, setOrdenesEnEspera] = useState<any[]>([])
    const [ordenEnCorte, setOrdenEnCorte] = useState<any | null>(null)
    const [ordenSeleccionadaEspera, setOrdenSeleccionadaEspera] = useState<number | null>(null)
    const [motivoEspera, setMotivoEspera] = useState<(typeof MOTIVOS_ESPERA)[number] | ''>('')
    const [actualizandoEsperaId, setActualizandoEsperaId] = useState<number | null>(null)
    const segundosTranscurridosRef = useRef(0)
    const [inicioCorteMs, setInicioCorteMs] = useState<number | null>(null)
    const [segundosIniciales, setSegundosIniciales] = useState(0)
    const isLatestRequest = useLatestRequest()

    const cargarOrdenes = async (mostrarCarga = true) => {
        const esUltimaSolicitud = isLatestRequest()
        if (mostrarCarga) setLoading(true)
        try {
            const res = await fetch('/api/admin_costura/ordenes', { cache: 'no-store' })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (esUltimaSolicitud() && data.success) {
                setOrdenes(data.ordenes)
                setOrdenesEnEspera(Array.isArray(data.en_espera) ? data.en_espera : [])

                const enProceso = data.ordenes.find((o: any) => o.estado === 'corte en proceso')
                setOrdenEnCorte(enProceso || null)
                if (enProceso) {
                    const inicioGuardado = localStorage.getItem(`corte_inicio_${enProceso.id}`)
                    if (inicioGuardado) {
                        const segundosCalculados = Math.floor((Date.now() - Number(inicioGuardado)) / 1000)
                        const segundosActuales = segundosCalculados > 0 ? segundosCalculados : 0
                        segundosTranscurridosRef.current = segundosActuales
                        setSegundosIniciales(segundosActuales)
                        setInicioCorteMs(Number(inicioGuardado))
                    } else {
                        const inicio = Date.now()
                        localStorage.setItem(`corte_inicio_${enProceso.id}`, inicio.toString())
                        segundosTranscurridosRef.current = 0
                        setSegundosIniciales(0)
                        setInicioCorteMs(inicio)
                    }
                } else {
                    segundosTranscurridosRef.current = 0
                    setSegundosIniciales(0)
                    setInicioCorteMs(null)
                }
            }
        } catch (error) {
            console.error("Error al cargar órdenes:", error)
        } finally {
            if (mostrarCarga && esUltimaSolicitud()) setLoading(false)
        }
    }

    useEffect(() => {
        cargarOrdenes()
    }, [])

    useRealtimeRefresh(() => cargarOrdenes(false))

    const handleEnviarAPapeleraIndividual = async (id: number) => {
        if (ordenEnCorte && ordenEnCorte.id === id) {
            alert("No puedes eliminar la orden que se encuentra actualmente en proceso de corte.")
            return;
        }

        try {
            const res = await fetch('/api/admin_costura/papelera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id] })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                await cargarOrdenes(false)
            } else {
                alert(data.message || "Error al enviar la orden a papelera")
            }
        } catch (error) {
            console.error("Error al enviar a papelera:", error)
        }
    }

    const iniciarCorte = async (orden: any) => {
        if (ordenEnCorte) {
            alert("Ya tienes una orden en proceso de corte. Debes finalizarla antes de iniciar otra.")
            return;
        }

        try {
            const res = await fetch('/api/admin_costura/corte/iniciar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orden_id: orden.id })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setOrdenEnCorte(orden)
                segundosTranscurridosRef.current = 0
                setSegundosIniciales(0)
                const inicio = Date.now()
                setInicioCorteMs(inicio)
                localStorage.setItem(`corte_inicio_${orden.id}`, inicio.toString())
                await cargarOrdenes(false)
            } else {
                alert(data.message || 'No se pudo iniciar el corte.')
            }
        } catch (error) {
            console.error("Error al iniciar corte:", error)
        }
    }

    const finalizarCorte = async () => {
        if (!ordenEnCorte) return;

        try {
            const res = await fetch('/api/admin_costura/corte/finalizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orden_id: ordenEnCorte.id, segundos: segundosTranscurridosRef.current })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                localStorage.removeItem(`corte_inicio_${ordenEnCorte.id}`)
                setOrdenEnCorte(null)
                segundosTranscurridosRef.current = 0
                setSegundosIniciales(0)
                setInicioCorteMs(null)
                await cargarOrdenes(false)
            } else {
                alert(data.message || 'No se pudo finalizar el corte.')
            }
        } catch (error) {
            console.error("Error al finalizar corte:", error)
        }
    }

    const actualizarEsperaOrden = async (ordenId: number, accion: 'poner' | 'reanudar', motivo?: string) => {
        setActualizandoEsperaId(ordenId)
        try {
            const res = await fetch('/api/admin_costura/ordenes/espera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orden_id: ordenId, accion, motivo })
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
                alert(data.message || 'No se pudo actualizar el estado de espera de la OP.')
                return
            }

            setOrdenSeleccionadaEspera(null)
            setMotivoEspera('')
            await cargarOrdenes(false)
        } catch (error) {
            console.error('Error al actualizar OP en espera:', error)
            alert('Error de conexión al actualizar el estado de espera.')
        } finally {
            setActualizandoEsperaId(null)
        }
    }

    const ordenesOrdenadas = [...ordenes].sort((a, b) => {
        if (a.estado === 'corte en proceso') return -1;
        if (b.estado === 'corte en proceso') return 1;

        const aEsPrioritario = esPrioritario(a);
        const bEsPrioritario = esPrioritario(b);

        if (aEsPrioritario && !bEsPrioritario) return -1;
        if (!aEsPrioritario && bEsPrioritario) return 1;

        return 0;
    });

    const columns = [
        {
            header: 'Limpieza',
            accessorKey: (row: any) => (
                <button
                    onClick={() => handleEnviarAPapeleraIndividual(row.id)}
                    title="Enviar a papelera"
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                >
                    <Icon icon="lucide:trash-2" className="text-base" />
                </button>
            )
        },
        { header: 'RQ', accessorKey: 'rq' },
        { header: 'OP', accessorKey: 'op' },
        { 
            header: 'Producto', 
            accessorKey: (row: any) => (
                <div className="flex items-center gap-1.5">
                    <span>{row.producto}</span>
                    {esPrioritario(row) && (
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase border border-amber-300">
                            Prioritario
                        </span>
                    )}
                </div>
            ) 
        },
        { header: 'Nombre', accessorKey: 'nombre' },
        { header: 'Cantidad', accessorKey: 'cantidad' },
        {
            header: 'Acción de Corte',
            accessorKey: (row: any) => {
                const esLaPrimeraFila = ordenesOrdenadas.length > 0 && ordenesOrdenadas[0].id === row.id;
                
                const estaSiendoCortada = row.estado === 'corte en proceso' || (ordenEnCorte && ordenEnCorte.id === row.id);

                if (estaSiendoCortada) {
                    return <span className="text-orange-600 font-bold text-xs animate-pulse">Cortando en proceso...</span>
                }
                
                if (row.estado === 'cortada') {
                    return <span className="text-green-600 font-semibold text-xs">Cortado ✓</span>
                }

                if (esLaPrimeraFila) {
                    return (
                        <button 
                            onClick={() => iniciarCorte(row)}
                            disabled={!!ordenEnCorte}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50 shadow-sm font-semibold"
                        >
                            Iniciar Corte
                        </button>
                    )
                }

                return <span className="text-gray-400 text-xs italic">Esperando turno...</span>
            }
        },
        {
            header: 'Poner en espera',
            accessorKey: (row: any) => {
                if (row.estado === 'corte en proceso' || ordenEnCorte?.id === row.id) {
                    return <span className="text-xs text-gray-400">Corte iniciado</span>
                }

                if (ordenSeleccionadaEspera === row.id) {
                    return (
                        <div className="flex min-w-52 flex-col gap-2">
                            <select
                                value={motivoEspera}
                                onChange={(event) => setMotivoEspera(event.target.value as (typeof MOTIVOS_ESPERA)[number] | '')}
                                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700"
                                aria-label={`Motivo para poner en espera la OP ${row.op}`}
                            >
                                <option value="">Selecciona un motivo</option>
                                {MOTIVOS_ESPERA.map((motivo) => <option key={motivo} value={motivo}>{motivo}</option>)}
                            </select>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => void actualizarEsperaOrden(row.id, 'poner', motivoEspera)}
                                    disabled={!motivoEspera || actualizandoEsperaId === row.id}
                                    className="rounded-md bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                                >
                                    {actualizandoEsperaId === row.id ? 'Guardando...' : 'Confirmar espera'}
                                </button>
                                <button
                                    onClick={() => {
                                        setOrdenSeleccionadaEspera(null)
                                        setMotivoEspera('')
                                    }}
                                    className="rounded-md border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )
                }

                return (
                    <button
                        onClick={() => {
                            setOrdenSeleccionadaEspera(row.id)
                            setMotivoEspera('')
                        }}
                        disabled={!!ordenEnCorte || actualizandoEsperaId !== null}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Apartar esta OP temporalmente de la cola de corte"
                    >
                        <Icon icon="lucide:pause" /> Poner en espera
                    </button>
                )
            }
        }
    ]

    if (loading) return <div className="text-center py-10 text-gray-400 text-sm">Cargando órdenes de costura...</div>

    return (
        <div className="mx-auto space-y-6">
            <div className="pt-4">
                <h1 className="text-2xl font-bold text-gray-800">Filtrado y Corte de Órdenes</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Elimine las órdenes ajenas a su área usando el botón de papelera en cada fila y ejecute el corte estrictamente en la primera orden disponible.
                </p>
            </div>

            {ordenEnCorte && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between">
                    <div>
                        <span className="bg-blue-500/30 text-blue-200 text-xs px-2.5 py-1 rounded-full font-medium">Orden Activa en Corte</span>
                        <h3 className="text-xl font-bold mt-2">OP: {ordenEnCorte.op} - {ordenEnCorte.producto}</h3>
                        <p className="text-xs text-blue-200 mt-1">Cantidad a procesar: {ordenEnCorte.cantidad} unidades</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <span className="text-xs text-blue-300 block">Tiempo transcurrido</span>
                            <TiempoCorte
                                inicioMs={inicioCorteMs}
                                segundosIniciales={segundosIniciales}
                                segundosRef={segundosTranscurridosRef}
                            />
                        </div>
                        <button 
                            onClick={finalizarCorte}
                            className="px-5 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition-colors shadow-md"
                        >
                            Finalizar Corte
                        </button>
                    </div>
                </div>
            )}

            <div>
                {/* Ilustración estática para evitar animaciones continuas en la terminal. */}
                <div className="w-full flex justify-center items-center py-1 mb-2">
                    <AnimacionArmadoSilla />
                </div>

                <ReusableTable data={ordenesOrdenadas} columns={columns} searchField='op' searchPlaceholder="Buscar por op..."/>
            </div>

            <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                            <Icon icon="lucide:pause-circle" className="text-amber-600" />
                            Órdenes en espera
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">Estas OP no bloquean la cola de corte. Puedes devolverlas cuando estén listas.</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{ordenesEnEspera.length}</span>
                </div>

                {ordenesEnEspera.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-amber-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
                        No hay órdenes en espera.
                    </p>
                ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                        {ordenesEnEspera.map((orden) => (
                            <article key={orden.id} className="flex flex-col justify-between gap-4 rounded-xl border border-amber-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-mono text-slate-500">OP</span>
                                        <h3 className="font-bold text-slate-900">{orden.op}</h3>
                                        {esPrioritario(orden) && (
                                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Prioritaria</span>
                                        )}
                                    </div>
                                    <p className="mt-1 truncate text-sm text-slate-700">{orden.producto} · {orden.nombre}</p>
                                    <p className="mt-1 text-xs text-slate-500">Cantidad: {orden.cantidad}</p>
                                    <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                                        Motivo: {orden.motivo_espera}
                                    </p>
                                </div>
                                <button
                                    onClick={() => void actualizarEsperaOrden(orden.id, 'reanudar')}
                                    disabled={actualizandoEsperaId !== null}
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    <Icon icon="lucide:rotate-ccw" />
                                    {actualizandoEsperaId === orden.id ? 'Reanudando...' : 'Regresar a órdenes por cortar'}
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    )
}
