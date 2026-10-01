'use client'

import { useEffect, useState } from "react"
import { Icon } from "@iconify/react"
import ReusableTable from "@/components/ReusableTable"

const PREFIJOS_PRIORITARIOS = [
    "103-070",
    "103-046",
    "202-070",
    "102-070",
    "102-020",
    "102-019",
    "102-160",
    "102-139",
    "102-137",
    "102-136",
    "202-136",
    "102-135",
    "102-132",
    "202-013",
    "102-110",
    "202-110",
    "202-137",
    "101-002"
];

const esPrioritario = (row: any) => {
    const textoProducto = String(row.producto || '').trim();
    const textoNombre = String(row.nombre || '').trim();

    return PREFIJOS_PRIORITARIOS.some(prefijo => 
        textoProducto.startsWith(prefijo) || textoNombre.startsWith(prefijo)
    );
};

// COMPONENTE DE DIBUJO ANIMADO DE CONSTRUCCIÓN DE SILLA
function AnimacionArmadoSilla() {
    return (
        <div className="flex items-center justify-center h-10 w-full overflow-hidden">
            <svg viewBox="0 0 400 120" className="h-full w-auto">
                <style>{`
                    @keyframes caerBase {
                        0%, 10% { transform: translateY(-40px); opacity: 0; }
                        20%, 90% { transform: translateY(0); opacity: 1; }
                        100% { opacity: 0; }
                    }
                    @keyframes caerPiston {
                        0%, 20% { transform: translateY(-40px); opacity: 0; }
                        30%, 90% { transform: translateY(0); opacity: 1; }
                        100% { opacity: 0; }
                    }
                    @keyframes caerAsiento {
                        0%, 35% { transform: translateY(-40px); opacity: 0; }
                        45%, 90% { transform: translateY(0); opacity: 1; }
                        100% { opacity: 0; }
                    }
                    @keyframes caerRespaldo {
                        0%, 50% { transform: translateY(-40px); opacity: 0; }
                        60%, 90% { transform: translateY(0); opacity: 1; }
                        100% { opacity: 0; }
                    }
                    @keyframes caerBrazos {
                        0%, 65% { transform: translateY(-40px); opacity: 0; }
                        75%, 90% { transform: translateY(0); opacity: 1; }
                        100% { opacity: 0; }
                    }
                    @keyframes destelloFinal {
                        0%, 78% { opacity: 0; transform: scale(0.5); }
                        82% { opacity: 1; transform: scale(1.2); }
                        90% { opacity: 0; transform: scale(1.5); }
                        100% { opacity: 0; }
                    }

                    .anim-base { animation: caerBase 4s infinite cubic-bezier(0.34, 1.56, 0.64, 1); origin: center; }
                    .anim-piston { animation: caerPiston 4s infinite cubic-bezier(0.34, 1.56, 0.64, 1); }
                    .anim-asiento { animation: caerAsiento 4s infinite cubic-bezier(0.34, 1.56, 0.64, 1); }
                    .anim-respaldo { animation: caerRespaldo 4s infinite cubic-bezier(0.34, 1.56, 0.64, 1); }
                    .anim-brazos { animation: caerBrazos 4s infinite cubic-bezier(0.34, 1.56, 0.64, 1); }
                    .anim-destello { animation: destelloFinal 4s infinite ease-out; transform-origin: 200px 50px; }
                `}</style>

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
    const [ordenEnCorte, setOrdenEnCorte] = useState<any | null>(null)
    const [segundosTranscurridos, setSegundosTranscurridos] = useState(0)
    const [temporizadorActivo, setTemporizadorActivo] = useState(false)

    const cargarOrdenes = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin_costura/ordenes')
            const data = await res.json()
            if (data.success) {
                setOrdenes(data.ordenes)

                const enProceso = data.ordenes.find((o: any) => o.estado === 'corte en proceso')
                if (enProceso) {
                    setOrdenEnCorte(enProceso)
                    setTemporizadorActivo(true)

                    const inicioGuardado = localStorage.getItem(`corte_inicio_${enProceso.id}`)
                    if (inicioGuardado) {
                        const segundosCalculados = Math.floor((Date.now() - Number(inicioGuardado)) / 1000)
                        setSegundosTranscurridos(segundosCalculados > 0 ? segundosCalculados : 0)
                    } else {
                        localStorage.setItem(`corte_inicio_${enProceso.id}`, Date.now().toString())
                    }
                }
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

    useEffect(() => {
        let intervalo: any = null;
        if (temporizadorActivo) {
            intervalo = setInterval(() => {
                setSegundosTranscurridos(prev => prev + 1)
            }, 1000)
        } else {
            clearInterval(intervalo)
        }
        return () => clearInterval(intervalo)
    }, [temporizadorActivo])

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
            if (data.success) {
                setOrdenes(prevOrdenes => prevOrdenes.filter(o => o.id !== id))
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
            if (data.success) {
                setOrdenEnCorte(orden)
                setSegundosTranscurridos(0)
                setTemporizadorActivo(true)
                localStorage.setItem(`corte_inicio_${orden.id}`, Date.now().toString())
                cargarOrdenes()
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
                body: JSON.stringify({ orden_id: ordenEnCorte.id, segundos: segundosTranscurridos })
            })
            const data = await res.json()
            if (data.success) {
                localStorage.removeItem(`corte_inicio_${ordenEnCorte.id}`)
                setOrdenEnCorte(null)
                setTemporizadorActivo(false)
                setSegundosTranscurridos(0)
                cargarOrdenes()
            }
        } catch (error) {
            console.error("Error al finalizar corte:", error)
        }
    }

    const formatTiempo = (segundos: number) => {
        const mins = Math.floor(segundos / 60)
        const secs = segundos % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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
                            <span className="text-3xl font-mono font-bold">{formatTiempo(segundosTranscurridos)}</span>
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
                {/* DIBUJO ANIMADO DE ARMADO EN EL ESPACIO LIBRE */}
                <div className="w-full flex justify-center items-center py-1 mb-2">
                    <AnimacionArmadoSilla />
                </div>

                <ReusableTable data={ordenesOrdenadas} columns={columns} searchField='op' searchPlaceholder="Buscar por op..."/>
            </div>
        </div>
    )
}