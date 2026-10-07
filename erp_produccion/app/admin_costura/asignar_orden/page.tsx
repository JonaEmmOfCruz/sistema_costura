'use client'

import { useEffect, useState } from "react"
import ReusableTable from "@/components/ReusableTable"
import { Icon } from "@iconify/react"

// Lista de prefijos prioritarios
const PREFIJOS_PRIORITARIOS = [
    "103-070", "103-046", "202-070", "102-070", "102-020",
    "102-019", "102-160", "102-139", "102-137", "102-136",
    "202-136", "102-135", "102-132", "202-013", "102-110",
    "202-110", "202-137", "101-002"
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
    const [loading, setLoading] = useState(true)
    const [ordenesCortadas, setOrdenesCortadas] = useState<any[]>([])
    const [modal, setModal] = useState<ModalState>({ isOpen: false, type: 'confirm', message: '' })
    
    // Estado para controlar solicitudes enviadas localmente en la sesión
    const [solicitandoId, setSolicitandoId] = useState<string | null>(null)
    const [solicitados, setSolicitados] = useState<Record<string, boolean>>({})

    // Mapa para registrar las peticiones pendientes consultadas en la BD
    const [peticionesBD, setPeticionesBD] = useState<Record<string, boolean>>({})

    const cargarOrdenesCortadas = async () => {
        try {
            await fetch('/api/admin_costura/auto_asignar', { method: 'POST' })

            // Consultamos en paralelo las órdenes cortadas y las peticiones pendientes registradas en DB
            const [resCortadas, resPeticiones] = await Promise.all([
                fetch('/api/admin_costura/cortadas'),
                fetch('/api/productos/peticiones')
            ])

            if (resCortadas.ok) {
                const dataCortadas = await resCortadas.json()
                if (dataCortadas.success) {
                    setOrdenesCortadas(dataCortadas.ordenes || [])
                }
            }

            if (resPeticiones.ok) {
                const dataPeticiones = await resPeticiones.json()
                if (dataPeticiones.success && Array.isArray(dataPeticiones.peticiones)) {
                    const mapaPeticiones: Record<string, boolean> = {}
                    dataPeticiones.peticiones.forEach((p: any) => {
                        if (p.codigo) mapaPeticiones[p.codigo] = true;
                        if (p.op) mapaPeticiones[p.op] = true;
                    })
                    setPeticionesBD(mapaPeticiones)
                }
            }

        } catch (error) {
            console.error("Error al cargar órdenes o peticiones:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarOrdenesCortadas()
    }, [])

    const cerrarModal = () => setModal(prev => ({ ...prev, isOpen: false }))

    // Función para extraer el modelo (2do string del formato string-string-string...)
    const extraerModelo = (producto: string) => {
        if (!producto) return '';
        const partes = producto.split('-');
        return partes.length >= 2 ? partes[1].trim() : partes[0].trim();
    }

    // Solicitud de métrica de tiempo para productos no registrados
    const handleSolicitarTiempo = async (e: React.MouseEvent, row: any) => {
        e.stopPropagation();
        const rowId = row.op || row.producto;

        // Evitar múltiples ejecuciones si ya está procesando o si ya fue solicitado
        if (solicitandoId === rowId || solicitados[rowId] || peticionesBD[row.op] || peticionesBD[row.producto]) return;

        setSolicitandoId(rowId)

        const modeloExtraido = extraerModelo(row.producto);

        try {
            const res = await fetch('/api/productos/peticiones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    op: row.op,
                    modelo: modeloExtraido,
                    codigo: row.producto,              // codigo = producto
                    nombre_secundario: row.nombre,    // nombre_secundario = nombre
                })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setSolicitados(prev => ({ ...prev, [rowId]: true }))
                // Actualizamos también el mapa de la BD para persistir el bloqueo sin recargar
                setPeticionesBD(prev => ({ 
                    ...prev, 
                    [row.producto]: true,
                    ...(row.op ? { [row.op]: true } : {})
                }))
                setModal({
                    isOpen: true,
                    type: 'success',
                    message: data.message || `Solicitud enviada exitosamente para el modelo "${modeloExtraido}". Se notificó a gestión de tiempos.`
                })
            } else {
                setModal({
                    isOpen: true,
                    type: 'error',
                    message: data.message || 'No se pudo registrar la solicitud de tiempo.'
                })
            }
        } catch (error) {
            setModal({
                isOpen: true,
                type: 'error',
                message: 'Error de comunicación al solicitar tiempo.'
            })
        } finally {
            setSolicitandoId(null)
        }
    }

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
                
                const tiempoTotalMinutos = Math.ceil(tiempoTotalSegundos / 60);
                const excedeTurno = tiempoTotalMinutos > 480;
                const rowId = row.op || row.producto;

                // VERIFICACIÓN: Revisa el estado local, las peticiones obtenidas de BD y peticiones del backend
                const tienePeticionEnBD = peticionesBD[row.producto] || (row.op && peticionesBD[row.op]);
                const estaSolicitado = solicitados[rowId] || tienePeticionEnBD || row.peticion_pendiente;

                // SI NO TIENE TIEMPO ASIGNADO, MOSTRAR BOTÓN DE SOLICITAR O ESTATUS PENDIENTE
                if (!tiempoUnidadSegundos) {
                    return (
                        <div className="flex flex-col items-start gap-1">
                            <span className="text-amber-600 text-xs italic font-medium">Sin métrica</span>
                            {estaSolicitado ? (
                                <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-lg flex items-center gap-1">
                                    <Icon icon="lucide:clock" className="animate-spin text-xs" />
                                    Solicitud Pendiente
                                </span>
                            ) : (
                                <button
                                    onClick={(e) => handleSolicitarTiempo(e, row)}
                                    disabled={solicitandoId === rowId}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {solicitandoId === rowId ? (
                                        <>
                                            <Icon icon="lucide:loader-2" className="animate-spin text-sm" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon="lucide:timer" className="text-sm" />
                                            Solicitar tiempo
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    );
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
        return <div className="text-center py-10 text-gray-400 text-sm">Cargando historial de cortes...</div>
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