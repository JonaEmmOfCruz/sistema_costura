'use client'

import { useState, useRef, useEffect } from "react"
import { Icon } from "@iconify/react"
import { useRouter } from "next/navigation"

interface HeaderProps {
    user: {
        nombre: string,
        tipo_usuario: string;
    }
    onToggleSidebar?: () => void
}

export default function Header({ user }: HeaderProps) {
    const [menuAbierto, setMenuAbierto] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Cerrar el menú si se hace clic fuera de él
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuAbierto(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleCerrarSesion = async () => {
        try {
            // Si tienes una API para destruir la sesión, puedes llamarla aquí
            // await fetch('/api/auth/logout', { method: 'POST' })
            
            // Redirigir al login o página principal
            router.push('/') 
        } catch (error) {
            console.error("Error al cerrar sesión", error)
        }
    }

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 z-10 relative">
            <div className="relative" ref={menuRef}>
                {/* Botón del Perfil */}
                <button 
                    onClick={() => setMenuAbierto(!menuAbierto)}
                    className="flex items-center gap-3 focus:outline-none hover:bg-gray-50 p-1.5 rounded-xl transition-colors"
                >
                    <span className="text-sm font-medium text-gray-700">{user.nombre}</span>
                    <div className="w-9 h-9 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {user.nombre ? user.nombre.charAt(0) : "-"}
                    </div>
                </button>

                {/* Card / Menú Flotante de Cerrar Sesión */}
                {menuAbierto && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-4 py-2 border-b border-gray-100">
                            <p className="text-xs text-gray-400 font-medium">Conectado como</p>
                            <p className="text-sm font-bold text-gray-800 truncate">{user.nombre}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold rounded-full uppercase">
                                {user.tipo_usuario}
                            </span>
                        </div>

                        <div className="p-1">
                            <button
                                onClick={handleCerrarSesion}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold transition-colors"
                            >
                                <Icon icon="lucide:log-out" className="text-base" />
                                <span>Cerrar Sesión</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}