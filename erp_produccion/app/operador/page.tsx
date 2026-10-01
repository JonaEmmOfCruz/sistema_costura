'use client'

import { useEffect, useState } from "react"
import { Icon } from "@iconify/react"

export default function OperadorPage() {
    const [user, setUser] = useState<any>(null)
    const [asignacion, setAsignacion] = useState<any | null>(null)
    const [mostrarAlerta, setMostrarAlerta] = useState(false)
    const [segundos, setSegundos] = useState(0)
    const [costuraActiva, setCosturaActiva] = useState(false)
    const [loadingTerminar, setLoadingTerminar] = useState(false)

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

    // 2. Buscamos las asignaciones cuando tenemos el id del operador
    useEffect(() => {
        if (user && user.id) {
            cargarAsignacionPendiente(user.id)
        }
    }, [user])

    // 3. Evaluar el producto asignado (extraer su 2º string) para buscar el manual
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
            const res = await fetch(`/api/operador/asignaciones?id_operador=${idOperador}`)
            const data = await res.json()
            
            if (data.success && data.asignaciones.length > 0) {
                const nuevaAsignacion = data.asignaciones[0]
                setAsignacion(nuevaAsignacion)
                
                const inicioGuardado = localStorage.getItem(`costura_inicio_${nuevaAsignacion.id}`)
                if (inicioGuardado) {
                    const transcurrido = Math.floor((Date.now() - Number(inicioGuardado)) / 1000)
                    setSegundos(transcurrido > 0 ? transcurrido : 0)
                    setCosturaActiva(true)
                    setMostrarAlerta(false)
                } else {
                    setMostrarAlerta(true)
                }
            } else {
                setAsignacion(null)
                setMostrarAlerta(false)
            }
        } catch (error) {
            console.error("Error al cargar asignación:", error)
        }
    }

    useEffect(() => {
        let intervalo: any = null
        if (costuraActiva) {
            intervalo = setInterval(() => setSegundos(prev => prev + 1), 1000)
        } else {
            clearInterval(intervalo)
        }
        return () => clearInterval(intervalo)
    }, [costuraActiva])

    const iniciarCostura = async () => {
        try {
            const res = await fetch('/api/operador/costura/iniciar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ asignacion_id: asignacion.id })
            })
            const data = await res.json()
            if (data.success) {
                localStorage.setItem(`costura_inicio_${asignacion.id}`, Date.now().toString())
                setCosturaActiva(true)
            }
        } catch (error) {
            console.error("Error al iniciar:", error)
        }
    }

    // Función para Almacenar/Terminar la orden
    const terminarCostura = async () => {
        if (!asignacion) return
        setLoadingTerminar(true)

        try {
            const fechaFinActual = new Date().toISOString()

            // Intenta guardar enviando a tu endpoint principal o al de operador
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
                // Limpia el contador local
                localStorage.removeItem(`costura_inicio_${asignacion.id}`)
                setCosturaActiva(false)
                setSegundos(0)
                setAsignacion(null)
                setManual(null)

                // Carga la siguiente asignación pendiente si la hay
                if (user && user.id) {
                    cargarAsignacionPendiente(user.id)
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

    const formatTiempo = (seg: number) => {
        const m = Math.floor(seg / 60).toString().padStart(2, '0')
        const s = (seg % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                 <span className="text-sm font-medium animate-pulse">Verificando tareas...</span>
            </div>
        )
    }

    if (!asignacion && !mostrarAlerta) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Icon icon="lucide:check-circle-2" className="text-6xl mb-4 text-slate-300" />
                <p>No tienes asignaciones pendientes en este momento.</p>
            </div>
        )
    }

    const textoProducto = asignacion?.producto || asignacion?.nombre || ''
    const partesProducto = textoProducto.split('-')
    const codigoSegundoString = partesProducto.length >= 2 ? partesProducto[1].trim() : textoProducto.trim()

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
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">Tarea Actual</span>
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

                            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60 text-center min-w-[90px]">
                                <p className="text-[10px] uppercase font-semibold text-slate-400">Tiempo</p>
                                <p className="text-lg font-mono font-bold text-slate-800">{formatTiempo(segundos)}</p>
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
        </div>
    )
}