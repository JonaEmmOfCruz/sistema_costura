'use client'

import { useEffect, useState } from "react"
import AreaCard from "@/components/AreaCard"

export default function OperadoresPage() {
    const [loading, setLoading] = useState(true)
    const [operadores, setOperadores] = useState<any[]>([])
    const [asignadas, setAsignadas] = useState([])

    const cargarOperadores = async () => {
        try {
            const res = await fetch('/api/operadores')
            const data = await res.json()
            if (data.success) {
                setOperadores(data.usuarios)
            }
        } catch (error) {
            console.error("Error al cargar operadores:", error)
        } finally {
            setLoading(false)
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
            if (data.success) {
                // Recargamos la lista para reflejar el nuevo estado y el tiempo de expiración
                cargarOperadores()
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
            if (data.success) {
                cargarOperadores()
            } else {
                alert(data.message || "Error al deshabilitar operador")
            }
        } catch (error) {
            console.error("Error al deshabilitar operador:", error)
        }
    }

    const cargarOrdenes = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin_costura/asignadas')
            const data = await res.json()
            if (data.success) {
                setAsignadas(data.asignadas)
            }
        } catch (error) {
            console.error("Error al cargar órdenes:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarOrdenes()
    }, [])

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