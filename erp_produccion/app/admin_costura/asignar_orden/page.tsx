'use client'

import { useEffect, useState } from "react"
import ReusableTable from "@/components/ReusableTable"
import { Icon } from "@iconify/react"

interface ModalState {
    isOpen: boolean;
    type: 'confirm' | 'success' | 'error';
    message: string;
    onConfirm?: () => void;
}

export default function OrdenesCortadasPage() {
    const [loading, setLoading] = useState(true)
    const [ordenesCortadas, setOrdenesCortadas] = useState<any[]>([])
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'confirm', message: '' })

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

    // Paso 1: Abrir el modal de confirmación adaptado al caso de cantidad = 1
    const handleAsignacionEquitativa = (orden: any) => {
        const cantidadOp = Number(orden.cantidad) || 0;

        const mensajeConfirmacion = cantidadOp === 1
            ? `Esta OP cuenta únicamente con 1 unidad. Se le asignará solo a 1 operador libre y los demás seguirán disponibles. ¿Deseas continuar?`
            : `¿Deseas asignar equitativamente la cantidad de esta OP (${cantidadOp}) entre los operadores disponibles?`;

        setModal({
            isOpen: true,
            type: 'confirm',
            message: mensajeConfirmacion,
            onConfirm: () => ejecutarAsignacion(orden.id)
        })
    }

    // Paso 2: Ejecutar la API si el usuario confirma
    const ejecutarAsignacion = async (orden_id: string) => {
        setModal(prev => ({ ...prev, isOpen: false }))

        try {
            const res = await fetch('/api/admin_costura/asignar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orden_id })
            })
            const data = await res.json()
            
            if (data.success) {
                setModal({ isOpen: true, type: 'success', message: data.message })
                cargarOrdenesCortadas()
            } else {
                setModal({ isOpen: true, type: 'error', message: data.message || "No se puede realizar la asignación en este momento." })
            }
        } catch (error) {
            console.error("Error en asignación equitativa:", error)
            setModal({ isOpen: true, type: 'error', message: "Ocurrió un error inesperado al intentar realizar la asignación." })
        }
    }

    const cerrarModal = () => setModal(prev => ({ ...prev, isOpen: false }))

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
        <div className="mx-auto space-y-6 p-6 relative">
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

            {/* Modal Minimalista */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            {modal.type === 'confirm' && <Icon icon="lucide:help-circle" className="text-blue-500 text-2xl" />}
                            {modal.type === 'success' && <Icon icon="lucide:check-circle-2" className="text-emerald-500 text-2xl" />}
                            {modal.type === 'error' && <Icon icon="lucide:x-circle" className="text-red-500 text-2xl" />}
                            <h3 className="font-semibold text-gray-800 text-lg">
                                {modal.type === 'confirm' ? 'Confirmar Asignación' : modal.type === 'success' ? 'Éxito' : 'Error'}
                            </h3>
                        </div>
                        
                        <p className="text-gray-600 text-sm leading-relaxed">
                            {modal.message}
                        </p>

                        <div className="flex justify-end gap-2 pt-2">
                            {modal.type === 'confirm' ? (
                                <>
                                    <button 
                                        onClick={cerrarModal}
                                        className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={modal.onConfirm}
                                        className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg shadow-sm transition-colors"
                                    >
                                        Asignar
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={cerrarModal}
                                    className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg shadow-sm transition-colors w-full"
                                >
                                    Entendido
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}