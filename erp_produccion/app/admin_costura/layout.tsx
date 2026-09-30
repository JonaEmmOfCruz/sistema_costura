'use client'

import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function AdminCosturaLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const router = useRouter()

    useEffect(() => {
        async function fetchUserData() {
            try {
                const res = await fetch('/api/me')
                const data = await res.json()

                if (res.ok && data.success) {
                    // Validar estrictamente que sea Administrador_Costura
                    if (data.user.tipo_usuario !== 'Administrador_Costura') {
                        if (data.user.tipo_usuario === 'Administrador') {
                            router.push('/admin')
                        } else if (data.user.tipo_usuario === 'Operador') {
                            router.push('/operador')
                        } else {
                            router.push('/')
                        }
                        return
                    }
                    setUser(data.user)
                } else {
                    router.push('/')
                }
            } catch (error) {
                console.error("Error al obtener sesión:", error)
                router.push('/')
            } finally {
                setLoading(false)
            }
        }

        fetchUserData()
    }, [router])

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">
            <p>Cargando panel de costura...</p>
        </div>
    )

    if (!user) return null

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar isOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            
            <div className="flex-1 flex flex-col min-w-0">
                <Header user={user} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className="flex-1 p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}