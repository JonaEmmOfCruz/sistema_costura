'use client'

import { useEffect, useState } from "react"
import ReusableTable from "@/components/ReusableTable"
import SewingLoader from "@/components/SewingLoader"
import usePaginatedApi from "@/lib/usePaginatedApi"
import { Icon } from "@iconify/react"

// Lista de prefijos prioritarios
const PREFIJOS_PRIORITARIOS = [
    "101-002", "101-006", "101-183", "101-320", "102-008",
    "102-011", "102-013", "102-019", "102-020", "102-070",
    "102-110", "102-132", "102-136", "102-137", "102-139",
    "102-160", "103-045", "103-046", "103-070", "104-019",
    "104-051", "104-070", "108-007", "108-078", "108-079",
    "110-378", "112-136", "202-020", "202-160"
];

const esPrioritario = (row: any) => {
    const textoProducto = String(row.producto || '').trim();
    const textoNombre = String(row.nombre || '').trim();

    return PREFIJOS_PRIORITARIOS.some(prefijo => 
        textoProducto.startsWith(prefijo) || textoNombre.startsWith(prefijo)
    );
};

interface ModalState {
    isOpen: boolean;
    type: 'confirm' | 'success' | 'error';
    message: string;
    onConfirm?: () => void;
}

export default function OrdenesCortadasPage() {
    const { data: ordenesCortadas, loading, loadingMore, hasMore, loadMore, reload: recargarCortes } = usePaginatedApi<any>('/api/admin_costura/cortadas', 'ordenes', false)
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'confirm', message: '' })

    const cargarOrdenesCortadas = async () => {
        try {
            await fetch('/api/admin_costura/auto_asignar', { method: 'POST' })

            await recargarCortes()
        } catch (error) {
            console.error("Error al cargar órdenes cortadas:", error)
        }
    }

    useEffect(() => {
        cargarOrdenesCortadas()
    }, [])

    const cerrarModal = () => setModal(prev => ({ ...prev, isOpen: false }))

    const columns = [
        {
            header: 'Prioridad',
            accessorKey: (row: any) => {
                const prioritario = esPrioritario(row);
                
                if (prioritario) {
                    return (
                        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider bg-red-50 text-red-600 border border-red-200">
                            Prioritario
                        </span>
                    )
                }
                
                return (
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider bg-slate-100 text-slate-600">
                        Normal
                    </span>
                )
            }
        },
        { header: 'RQ', accessorKey: 'rq' },
        { header: 'OP', accessorKey: 'op' },
        { header: 'Producto', accessorKey: 'producto' },
        { header: 'Nombre', accessorKey: 'nombre' },
        { header: 'Cantidad', accessorKey: 'cantidad' },
        {
            header: 'Asignadas',
            accessorKey: (row: any) => {
                const asignado = Number(row.total_asignado) || 0;
                const total = Number(row.cantidad) || 0;
                const faltantes = total - asignado;
                
                return (
                    <div className="flex flex-col items-start justify-center">
                        <span className="font-semibold text-slate-700 text-sm">
                            {asignado} <span className="text-gray-400 font-normal">/ {total}</span>
                        </span>
                        {faltantes > 0 && asignado > 0 && (
                            <span className="text-[9px] font-bold text-amber-600 tracking-wide border border-amber-200 bg-amber-50 rounded px-1 mt-0.5 uppercase">
                                Faltan {faltantes}
                            </span>
                        )}
                        {asignado === 0 && (
                            <span className="text-[9px] font-bold text-gray-500 tracking-wide border border-gray-200 bg-gray-50 rounded px-1 mt-0.5 uppercase">
                                En espera
                            </span>
                        )}
                    </div>
                )
            }
        },
        {
            header: 'Tiempo Estimado',
            accessorKey: (row: any) => {
                const tiempoUnidadSegundos = Number(row.tiempo_base) || 0;
                const tiempoTotalSegundos = row.cantidad * tiempoUnidadSegundos;
                
                // Convertimos a minutos para la vista y validación
                const tiempoTotalMinutos = Math.ceil(tiempoTotalSegundos / 60);
                const excedeTurno = tiempoTotalMinutos > 480;

                if (!tiempoUnidadSegundos) {
                    return <span className="text-gray-400 text-xs italic">Sin métrica</span>;
                }

                return (
                    <div className="flex flex-col items-start justify-center">
                        <span className={`font-semibold text-sm ${excedeTurno ? 'text-red-600' : 'text-slate-700'}`}>
                            {tiempoTotalMinutos} min
                        </span>
                        {excedeTurno && (
                            <span className="text-[9px] font-bold text-red-500 tracking-wide border border-red-200 bg-red-50 rounded px-1 mt-0.5 uppercase">
                                + 8 Horas
                            </span>
                        )}
                    </div>
                )
            }
        },
        {
            header: 'Estatus y Razón',
            accessorKey: (row: any) => {
                const estatusActual = row.estatus?.toLowerCase();

                if (estatusActual === 'asignado') {
                    return (
                        <div className="flex flex-col items-start gap-1">
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200/60 rounded-full text-xs font-semibold flex items-center gap-1">
                                <Icon icon="lucide:check-circle-2" /> Asignado
                            </span>
                            <span className="text-[10px] text-gray-500 max-w-[150px] leading-tight">
                                Repartida exitosamente entre el personal.
                            </span>
                        </div>
                    )
                }
                
                if (estatusActual === 'asignacion parcial') {
                    return (
                        <div className="flex flex-col items-start gap-1">
                            <span className="px-2.5 py-1 bg-purple-50 text-purple-600 border border-purple-200/60 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap">
                                <Icon icon="lucide:pause-circle" /> En Cola / Pausada
                            </span>
                            <span className="text-[10px] text-gray-500 max-w-[150px] leading-tight">
                                Sin tiempo libre (480 min) o interrumpida por orden prioritaria.
                            </span>
                        </div>
                    )
                }

                return (
                    <div className="flex flex-col items-start gap-1">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-full text-xs font-semibold flex items-center gap-1">
                            <Icon icon="lucide:scissors" /> {row.estatus || 'Cortada'}
                        </span>
                        <span className="text-[10px] text-gray-500 max-w-[150px] leading-tight">
                            Lista. Esperando ciclo de auto-asignación.
                        </span>
                    </div>
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
        return <SewingLoader message="Cargando órdenes cortadas" compact />
    }

    return (
        <div className="mx-auto space-y-6 p-6 relative">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Historial de Órdenes Cortadas</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Listado oficial de las órdenes que han completado exitosamente su proceso de corte. Las asignaciones se gestionan automáticamente basándose en la prioridad y capacidad (480 min).
                </p>
            </div>

            <div>
                <ReusableTable
                    data={ordenesCortadas}
                    columns={columns}
                    searchField='op'
                    searchPlaceholder="Buscar por op..."
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                    onLoadMore={loadMore}
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
