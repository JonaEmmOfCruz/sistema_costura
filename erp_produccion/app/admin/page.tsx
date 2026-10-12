'use client'
import ProductionAnalyticsDashboard from "@/components/ProductionAnalyticsDashboard"
import { useEffect, useState } from "react"

interface AdminUser {
    nombre: string
}

export default function AdminDashboard() {
    const [user, setUser] = useState<AdminUser | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchUserData() {
            try {
                const res = await fetch('/api/me')
                const data = await res.json()
                if (res.ok && data.success) {
                    setUser({ nombre: String(data.user.nombre ?? '') })
                }
            } catch (error) {
                console.error("Error al obtener sesión:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchUserData()
    }, [])

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-500">
            <p>Cargando panel...</p>
        </div>
    )

    if (!user) return null

    return (
        <div className="flex-1 flex flex-col min-w-0">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Bienvenido, {user.nombre}</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Panel de administración general
                </p>
            </div>

            <ProductionAnalyticsDashboard />
        </div>
    )
}