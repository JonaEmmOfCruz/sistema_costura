'use client'
import { useEffect, useMemo, useState } from "react"
import AreaCard from "@/components/AreaCard"
import { Icon } from "@iconify/react"
import useRealtimeRefresh from "@/lib/useRealtimeRefresh"
import SewingLoader from "@/components/SewingLoader"
import usePaginatedApi from "@/lib/usePaginatedApi"

interface AsignacionOperador {
    nombre_operador?: string | null
    estatus?: string | null
    [key: string]: unknown
}

export default function OperadoresPage() {
    const [loading, setLoading] = useState(true)
    const operadoresPagina = usePaginatedApi<any>('/api/operadores', 'usuarios', false)
    const asignadasPagina = usePaginatedApi<AsignacionOperador>('/api/admin_costura/asignadas', 'asignadas', false)
    const operadores = operadoresPagina.data
    const asignadas = asignadasPagina.data

    const cargarOperadores = async (mostrarCarga = true) => {
        if (mostrarCarga) setLoading(true)
        try {
            await operadoresPagina.reload()
        } catch (error) {
            console.error("Error al cargar operadores:", error)
        } finally {
            if (mostrarCarga) {
                setLoading(false)
            }
        }
    }

    const handleHabilitarOperador = async (id: number) => {
        try {
            const res = await fetch('/api/operadores/habilitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                await Promise.all([cargarOperadores(), cargarOrdenes(false)])
            } else {
                alert(data.message || "Error al habilitar operador")
            }
        } catch (error) {
            console.error("Error al habilitar operador:", error)
        }
    }

    const handleDeshabilitarOperador = async (id: number) => {
        try {
            const res = await fetch('/api/operadores/deshabilitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                await Promise.all([cargarOperadores(), cargarOrdenes(false)])
            } else {
                alert(data.message || "Error al deshabilitar operador")
            }
        } catch (error) {
            console.error("Error al deshabilitar operador:", error)
        }
    }

    const cargarOrdenes = async (mostrarCarga = true) => {
        if (mostrarCarga) setLoading(true)
        try {
            await asignadasPagina.reload()
        } catch (error) {
            console.error("Error al cargar órdenes:", error)
        } finally {
            if (mostrarCarga) setLoading(false)
        }
    }

    useEffect(() => {
        const iniciar = async () => {
            const cargaOperadores = cargarOperadores(false)
            try {
                const res = await fetch('/api/admin_costura/auto_asignar', { method: 'POST' })
                const data = await res.json()
                if (!res.ok || !data.success) {
                    console.error("Error al ejecutar la auto-asignación:", data.message)
                }
            } catch (error) {
                console.error("Error al ejecutar la auto-asignación:", error)
            }
            await Promise.all([cargaOperadores, cargarOrdenes(false)])
            setLoading(false)
        }
        void iniciar()
    }, [])

    useRealtimeRefresh(async () => {
        await Promise.all([cargarOperadores(), cargarOrdenes(false)])
    })

    const ordenesPorOperador = useMemo(() => {
        const ordenes = new Map<string | null | undefined, AsignacionOperador[]>()
        for (const asignacion of asignadas) {
            if (asignacion.estatus === 'TERMINADO' || asignacion.estatus === 'completado') continue
            const operador = asignacion.nombre_operador
            const ordenesOperador = ordenes.get(operador)
            if (ordenesOperador) {
                ordenesOperador.push(asignacion)
            } else {
                ordenes.set(operador, [asignacion])
            }
        }
        return ordenes
    }, [asignadas])

    if (loading) {
        return <SewingLoader message="Cargando operadores" compact />
    }

    const ahora = new Date()

    return (
        <div className="mx-auto space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Disponibilidad de Operadores</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Habilite o deshabilite a los operadores para la asignación de próximas órdenes de costura.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Renderizamos a los operadores exactamente en el orden de la base de datos */}
                {operadores.map((op) => {
                    // Calculamos si sigue disponible evaluando la fecha de expiración
                    const expira = op.disponible_hasta ? new Date(op.disponible_hasta) : null
                    const estaDisponible = expira ? expira > ahora : false

                    // Filtrar órdenes asignadas a este operador (que no estén terminadas)
                    const ordenesAsignadas = ordenesPorOperador.get(op.nombre) ?? []

                    return (
                        <AreaCard
                            key={op.id}
                            numeroEmpleado={op.numero_empleado}
                            nombre={op.nombre}
                            area={op.area || 'Operaciones'}
                            disponible={estaDisponible}
                            expiraEn={op.disponible_hasta}
                            onHabilitar={() => handleHabilitarOperador(op.id)}
                            onDeshabilitar={() => handleDeshabilitarOperador(op.id)}
                            ordenesAsignadas={ordenesAsignadas}
                        />
                    )
                })}
            </div>

            {(operadoresPagina.hasMore || asignadasPagina.hasMore) && (
                <div className="flex flex-wrap justify-center gap-3">
                    {operadoresPagina.hasMore && (
                        <button type="button" onClick={operadoresPagina.loadMore} disabled={operadoresPagina.loadingMore} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60">
                            {operadoresPagina.loadingMore && <Icon icon="mdi:sewing-machine" className="animate-pulse text-base text-blue-600" />}
                            {operadoresPagina.loadingMore ? 'Cargando operadores…' : 'Cargar siguientes 50 operadores'}
                        </button>
                    )}
                    {asignadasPagina.hasMore && (
                        <button type="button" onClick={asignadasPagina.loadMore} disabled={asignadasPagina.loadingMore} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60">
                            {asignadasPagina.loadingMore && <Icon icon="mdi:sewing-machine" className="animate-pulse text-base text-blue-600" />}
                            {asignadasPagina.loadingMore ? 'Cargando asignaciones…' : 'Cargar siguientes 50 asignaciones'}
                        </button>
                    )}
                </div>
            )}

            {operadores.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron operadores registrados.
                </div>
            )}
        </div>
    )
}
