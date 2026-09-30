'use client'

import { Icon } from "@iconify/react"

interface AreaCardProps {
    numeroEmpleado: string | number
    nombre: string
    area: string
    disponible: boolean
    expiraEn?: string
    onHabilitar: () => void
    onDeshabilitar: () => void // <-- Nueva prop agregada
}

export default function AreaCard({
    numeroEmpleado,
    nombre,
    area,
    disponible,
    expiraEn,
    onHabilitar,
    onDeshabilitar // <-- Recibimos la prop
}: AreaCardProps) {
    return (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group">
            <div className="space-y-3">
                {/* Cabecera con Área, Estado y Número de Empleado */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-full uppercase tracking-wider">
                            {area}
                        </span>
                        {/* Indicador de Estado */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full ${
                            disponible ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-gray-100 text-gray-500'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${disponible ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                            {disponible ? 'Disponible' : 'No disponible'}
                        </span>
                    </div>
                    <span className="text-xs font-mono text-gray-400 font-medium">
                        #{numeroEmpleado}
                    </span>
                </div>
                
                {/* Nombre del Empleado */}
                <div>
                    <p className="text-xs text-gray-400 font-medium">Operador</p>
                    <h3 className="text-base font-bold text-gray-800 tracking-tight group-hover:text-blue-600 transition-colors">
                        {nombre}
                    </h3>
                    {disponible && expiraEn && (
                        <p className="text-[11px] text-emerald-600/80 mt-1 font-medium">
                            Expira: {new Date(expiraEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>
            </div>

            {/* Botones de acción */}
            <div className="pt-2 flex items-center justify-end border-t border-gray-100 gap-2">
                {disponible ? (
                    <button
                        onClick={onDeshabilitar}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60"
                    >
                        <Icon icon="lucide:user-x" className="text-sm" />
                        <span>Deshabilitar</span>
                    </button>
                ) : (
                    <button
                        onClick={onHabilitar}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-sm bg-blue-600 hover:bg-blue-700 text-white border border-transparent"
                    >
                        <Icon icon="lucide:user-check" className="text-sm" />
                        <span>Habilitar</span>
                    </button>
                )}
            </div>
        </div>
    )
}