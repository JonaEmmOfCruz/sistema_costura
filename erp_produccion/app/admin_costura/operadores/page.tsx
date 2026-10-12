'use client'
import { useEffect, useState } from "react"
import AreaCard from "@/components/AreaCard"
import useRealtimeRefresh from "@/lib/useRealtimeRefresh"
import useLatestRequest from "@/lib/useLatestRequest"

export default function OperadoresPage() {
    const [loading, setLoading] = useState(true)
    const [operadores, setOperadores] = useState<any[]>([])
    const [asignadas, setAsignadas] = useState([])
    const isLatestRequest = useLatestRequest()

    const cargarOperadores = async () => {
        const esUltimaSolicitud = isLatestRequest('operadores')
        try {
            const res = await fetch('/api/operadores', { cache: 'no-store' })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (esUltimaSolicitud() && data.success) {
                setOperadores(data.usuarios)
            }
        } catch (error) {
            console.error("Error al cargar operadores:", error)
        } finally {
            if (esUltimaSolicitud()) {
                setLoading(false)
            }
        }
    }

    useEffect(() => {
        cargarOperadores()
    }, [])

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
        const esUltimaSolicitud = isLatestRequest('asignaciones')
        if (mostrarCarga) setLoading(true)
        try {
            const res = await fetch('/api/admin_costura/asignadas', { cache: 'no-store' })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = await res.json()
            if (esUltimaSolicitud() && data.success) {
                setAsignadas(data.asignadas)
            }
        } catch (error) {
            console.error("Error al cargar órdenes:", error)
        } finally {
            if (mostrarCarga && esUltimaSolicitud()) setLoading(false)
        }
    }

    useEffect(() => {
        const iniciar = async () => {
            cargarOperadores()
            try {
                const res = await fetch('/api/admin_costura/auto_asignar', { method: 'POST' })
                const data = await res.json()
                if (!res.ok || !data.success) {
                    console.error("Error al ejecutar la auto-asignación:", data.message)
                }
            } catch (error) {
                console.error("Error al ejecutar la auto-asignación:", error)
            }
            await cargarOrdenes(false)
        }
        void iniciar()
    }, [])

    useRealtimeRefresh(async () => {
        await Promise.all([cargarOperadores(), cargarOrdenes(false)])
    })

    if (loading) {
        return <div className="text-center py-10 text-gray-400 text-sm">Cargando operadores...</div>
    }

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
                    const ahora = new Date()
                    const expira = op.disponible_hasta ? new Date(op.disponible_hasta) : null
                    const estaDisponible = expira ? expira > ahora : false

                    // Filtrar órdenes asignadas a este operador (que no estén terminadas)
                    const ordenesAsignadas = asignadas.filter(
                        (a: any) => a.nombre_operador === op.nombre && a.estatus !== 'TERMINADO' && a.estatus !== 'completado'
                    )

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

            {operadores.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron operadores registrados.
                </div>
            )}
        </div>
    )
}