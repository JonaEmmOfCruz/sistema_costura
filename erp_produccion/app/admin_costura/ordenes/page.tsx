'use client'

import { useEffect, useState } from "react"
import { Icon } from "@iconify/react"
import ReusableTable from "@/components/ReusableTable"

export default function AdminCosturaOrdenesPage() {
    const [loading, setLoading] = useState(false)
    const [ordenes, setOrdenes] = useState<any[]>([])
    const [ordenEnCorte, setOrdenEnCorte] = useState<any | null>(null)
    const [segundosTranscurridos, setSegundosTranscurridos] = useState(0)
    const [temporizadorActivo, setTemporizadorActivo] = useState(false)

    // Cargar órdenes desde la API del área de costura
    const cargarOrdenes = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin_costura/ordenes')
            const data = await res.json()
            if (data.success) {
                setOrdenes(data.ordenes)

                // CORRECCIÓN: Buscar exactamente 'corte en proceso' en lugar de 'cortando'
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
        {header: 'RQ', accessorKey: 'rq'},
        {header: 'OP', accessorKey: 'op'},
        {header: 'Producto', accessorKey: 'producto'},
        {header: 'Nombre', accessorKey: 'nombre'},
        {header: 'Cantidad', accessorKey: 'cantidad'},
        {
            header: 'Acción de Corte',
            accessorKey: (row: any) => {
                const esLaPrimeraFila = ordenes.length > 0 && ordenes[0].id === row.id;
                
                // CORRECCIÓN: Validar contra 'corte en proceso'
                const estaSiendoCortada = row.estado === 'corte en proceso' || (ordenEnCorte && ordenEnCorte.id === row.id);

                if (estaSiendoCortada) {
                    return <span className="text-orange-600 font-bold text-xs animate-pulse">Cortando en proceso...</span>
                }
                
                // CORRECCIÓN: Validar contra 'cortada'
                if (row.estado === 'cortada') {
                    return <span className="text-green-600 font-semibold text-xs">Cortado ✓</span>
                }

                if (esLaPrimeraFila) {
                    return (
                        <button 
                            onClick={() => iniciarCorte(row)}
                            disabled={!!ordenEnCorte}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50 shadow-sm"
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
                <ReusableTable data={ordenes} columns={columns} searchField='op' searchPlaceholder="Buscar por op..."/>
            </div>
        </div>
    )
}