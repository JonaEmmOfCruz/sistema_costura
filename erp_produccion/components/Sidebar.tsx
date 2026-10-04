'use client'

import { Icon } from "@iconify/react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

interface SidebarProps {
    isOpen: boolean;
    onToggleSidebar: () => void;
}

export default function Sidebar({ isOpen, onToggleSidebar }: SidebarProps) {
    const pathname = usePathname()
    const [userRole, setUserRole] = useState<string>('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchUserRole() {
            try {
                // El { credentials: 'include' } le indica al navegador que mande la cookie auth_token httpOnly
                const res = await fetch('/api/me', {
                    method: 'GET',
                    credentials: 'include' 
                })
                const data = await res.json()

                if (res.ok && data.success && data.user) {
                    setUserRole(data.user.tipo_usuario || '')
                }
            } catch (error) {
                console.error("Error al obtener el rol del usuario:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchUserRole()
    }, [])

    // Opciones del menú configuradas exclusivamente para el Administrador
    const menuItems = [
        {
            name: "Inicio",
            href: "/admin",
            icon: "lucide:layout-dashboard",
            roles: ["Administrador"] // Solo visible para el Administrador
        },
        {
            name: "Ordenes",
            href: "/admin/subir_ordenes",
            icon: "lucide:upload",
            roles: ["Administrador"]
        },
        {
            name: "Manuales",
            href: "/admin/subir_manuales",
            icon: "lucide:file-archive",
            roles: ["Administrador"]
        },
        {
            name: "Tiempos",
            href: "/admin/subir_tiempos",
            icon: "entypo:time-slot",
            roles: ["Administrador"]
        },
        {
            name: "Usuarios",
            href: "/admin/usuarios",
            icon: "lucide:users",
            roles: ["Administrador"] // Opción exclusiva de administración
        },
        {
            name: "Ordenes",
            href: "/admin_costura/ordenes",
            icon: "lucide:file-spreadsheet",
            roles: ["Administrador_Costura"] // Opción exclusiva de administración
        },
        {
            name: "Operadores",
            href: "/admin_costura/operadores",
            icon: "lucide:user-round-cog",
            roles: ["Administrador_Costura"] // Opción exclusiva de administración
        },
        {
            name: "Asignar Ordenes",
            href: "/admin_costura/asignar_orden",
            icon: "lucide:file-check",
            roles: ["Administrador_Costura"] // Opción exclusiva de administración
        },
        {
            name: "Insumos",
            href: "https://insumos-2026.vercel.app/",
            icon: "lucide:box",
            roles: ["Administrador", "Administrador_Costura"]
        },
        {
            name: "Papelera",
            href: "/admin_costura/papelera",
            icon: "lucide:archive-x",
            roles: ["Administrador_Costura"] // Opción exclusiva de administración
        },
    ]

    // Filtrar los elementos basándose estrictamente en si el usuario es Administrador
    const filteredMenu = menuItems.filter(item => {
        if (!userRole) return false; 
        return item.roles.includes(userRole);
    })

    return (
        <aside className={`${isOpen ? "w-64" : "w-20"} bg-white border-b border-gray-200 flex flex-col z-25 shrink-0 transition-all duration-300`}>
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                {isOpen ?
                    (<div className="p-2.5 rounded-xl flex items-center justify-center">
                        <Image src="/logo.webp" alt="Logo" width={140} height={140} className="object-contain" />
                    </div>)
                    : (<div className="rounded-xl flex items-center justify-center">
                        <Image src="/iniciales.png" alt="G" width={140} height={140} className="object-contain" />
                    </div>)}
                <button onClick={onToggleSidebar} className="text-gray-600 hover:bg-gray-100 rounded-xl transition-colors p-1.5" title="Ocultar/Mostrar menú">
                    <Icon icon="solar:hamburger-menu-linear" className="text-xl" />
                </button>
            </div>

            {/* Opciones */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {loading ? (
                    <div className="text-xs text-gray-400 px-3 py-2">Cargando menú...</div>
                ) : (
                    filteredMenu.map((item, index) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className={`flex items-center gap-3 p-3 rounded-xl font-medium text-sm transition-colors ${
                                    isActive ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                                }`}
                            >
                                <Icon icon={item.icon} className="text-xl shrink-0" />
                                {isOpen && <span>{item.name}</span>}
                            </Link>
                        )
                    })
                )}
            </nav>
        </aside>
    )
}