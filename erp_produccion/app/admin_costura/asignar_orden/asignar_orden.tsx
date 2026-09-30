'use client'

import { useEffect, useState } from "react"
import ReusableTable from "@/components/ReusableTable"
import { Icon } from "@iconify/react"

export default function OrdenesCortadasPage() {
    const [loading, setLoading] = useState(true)
    const [ordenesCortadas, setOrdenesCortadas] = useState<any[]>([])

    const cargarOrdenesCortadas = async () => {
        try {
            const res = await fetch('/api/admin_costura/cortadas')
            const data = await res.json()
            if (data.success) {
                setOrdenesCortadas(data.ordenes)
            }
        } catch (error) {
            console.error("Error al cargar órdenes cortadas:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarOrdenesCortadas()
    }, [])

    const handleAsignacionEquitativa = async (orden: any) => {
        if (!confirm(`¿Deseas asignar equitativamente la cantidad de esta OP (${orden.cantidad}) entre los operadores disponibles?`)) {
            return;
        }

        try {
            const res = await fetch('/api/admin_costura/asignar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orden_id: orden.id })
            })
            const data = await res.json()
            
            if (data.success) {
                alert(data.message)
                cargarOrdenesCortadas()
            } else {
                alert(data.message || "No se puede realizar la asignación en este momento.")
            }
        } catch (error) {
            console.error("Error en asignación equitativa:", error)
            alert("Ocurrió un error inesperado al intentar realizar la asignación.")
        }
    }

    const columns = [
        {
            header: 'Asignación',
            accessorKey: (row: any) => {
                const estaAsignada = row.estatus?.toLowerCase() === 'asignado';

                return (
                    <button
                        onClick={() => handleAsignacionEquitativa(row)}
                        disabled={estaAsignada}
                        className={`px-3 py-1 text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors ${
                            estaAsignada
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                : 'bg-slate-700 text-white hover:bg-slate-800'
                        }`}
                    >
                        <Icon icon={estaAsignada ? "lucide:check-circle-2" : "lucide:users"} className="text-sm" />
                        <span>{estaAsignada ? 'Asignada' : 'Asignar'}</span>
                    </button>
                )
            }
        },
        { header: 'RQ', accessorKey: 'rq' },
        { header: 'OP', accessorKey: 'op' },
        { header: 'Producto', accessorKey: 'producto' },
        { header: 'Nombre', accessorKey: 'nombre' },
        { header: 'Cantidad', accessorKey: 'cantidad' },
        {
            header: 'Estatus',
            accessorKey: (row: any) => {
                const estaAsignada = row.estatus?.toLowerCase() === 'asignado';

                if (estaAsignada) {
                    return (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200/60 rounded-full text-xs font-semibold">
                            asignado
                        </span>
                    )
                }

                return (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-full text-xs font-semibold">
                        {row.estatus || 'cortada'}
                    </span>
                )
            }
        },
        {
            header: 'Inicio de Corte',
            accessorKey: (row: any) => row.fecha_inicio ? new Date(row.fecha_inicio).toLocaleString() : '-'
        },
        {
            header: 'Fin de Corte',
            accessorKey: (row: any) => row.fecha_fin ? new Date(row.fecha_fin).toLocaleString() : '-'
        }
    ]

    if (loading) {
        return <div className="text-center py-10 text-gray-400 text-sm">Cargando historial de cortes...</div>
    }

    return (
        <div className="mx-auto space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Historial de Órdenes Cortadas</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Listado oficial de las órdenes que han completado exitosamente su proceso de corte.
                </p>
            </div>

            <div>
                <ReusableTable
                    data={ordenesCortadas}
                    columns={columns}
                    searchField='op'
                    searchPlaceholder="Buscar por op..."
                />
            </div>
        </div>
    )
}