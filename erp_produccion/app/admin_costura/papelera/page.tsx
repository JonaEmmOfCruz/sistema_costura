'use client'

import { useEffect, useState } from "react"
import { Icon } from "@iconify/react"
import ReusableTable from "@/components/ReusableTable"

export default function AdminCosturaPapeleraPage() {
    const [loading, setLoading] = useState(false)
    const [ordenes, setOrdenes] = useState<any[]>([])

    // Cargar órdenes desde la papelera[cite: 10, 11]
    const cargarOrdenesPapelera = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin_costura/papelera')
            const data = await res.json()
            if (data.success) {
                setOrdenes(data.ordenes)
            }
        } catch (error) {
            console.error("Error al cargar papelera:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarOrdenesPapelera()
    }, [])

    // Función para recuperar la orden y regresarla a admin_costura_ordenes
    const handleRestaurarOrden = async (id: number) => {
        try {
            const res = await fetch('/api/admin_costura/papelera/restaurar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            const data = await res.json()
            if (data.success) {
                // Removemos la orden restaurada de la lista local de la papelera
                setOrdenes(prevOrdenes => prevOrdenes.filter(o => o.id !== id))
            } else {
                alert(data.message || "Error al restaurar la orden")
            }
        } catch (error) {
            console.error("Error al restaurar orden:", error)
        }
    }

    const columns = [
        {
            header: 'Restaurar',
            accessorKey: (row: any) => (
                <button
                    onClick={() => handleRestaurarOrden(row.id)}
                    title="Restaurar orden a costura"
                    className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-1 text-xs font-medium px-2.5"
                >
                    <Icon icon="lucide:rotate-ccw" className="text-base" />
                    <span>Restaurar</span>
                </button>
            )
        },
        {header: 'RQ', accessorKey: 'rq'},
        {header: 'OP', accessorKey: 'op'},
        {header: 'Producto', accessorKey: 'producto'},
        {header: 'Nombre', accessorKey: 'nombre'},
        {header: 'Observaciones', accessorKey: 'observaciones'},
        {header: 'Cantidad', accessorKey: 'cantidad'},
        {header: 'Cliente', accessorKey: 'cliente'},
        {header: 'Prioridad', accessorKey: 'prioridad'},
        {header: 'Vigente desde', accessorKey: (row: any) => row.vigente_desde ? new Date(row.vigente_desde).toLocaleDateString() : '-'},
        {header: 'Fecha de entrega', accessorKey: (row: any) => row.fecha_de_entrega ? new Date(row.fecha_de_entrega).toLocaleDateString() : '-'},
        {header: 'Eliminado el', accessorKey: (row: any) => row.eliminado_en ? new Date(row.eliminado_en).toLocaleDateString() : '-'},
    ]

    if (loading) return <div className="text-center py-10 text-gray-400 text-sm">Cargando papelera...</div>

    return (
        <div className="mx-auto space-y-6">
            <div className="pt-4">
                <h1 className="text-2xl font-bold text-gray-800">Papelera de Órdenes de Corte</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Gestione las órdenes eliminadas y restáurelas al área de costura si lo requiere.
                </p>
            </div>

            <div>
                <ReusableTable data={ordenes} columns={columns} searchField='op' searchPlaceholder="Buscar por op..."/>
            </div>
        </div>
    )
}