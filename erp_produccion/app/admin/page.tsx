'use client'

import UserStatsGrid from "@/components/UserStatsGrid"
import DynamicReportBuilder from "@/components/DynamicReportBuilder"
import { useEffect, useState } from "react"

export default function AdminDashboard() {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<any>(null)

    useEffect(() => {
        async function fetchUserData() {
            try {
                const res = await fetch('/api/me')
                const data = await res.json()
                if (res.ok && data.success) {
                    setUser(data.user)
                }
            } catch (error) {
                console.error("Error al obtener sesión:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchUserData()
    }, [])

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/usuarios/stats')
                const data = await res.json()
                if (res.ok && data.success) {
                    setStats(data.stats)
                }
            } catch (error) {
                console.error("Error al cargar estadísticas:", error)
            }
        }
        fetchStats()
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

            <div className="mt-10 space-y-6">
                {/* 1. Primera sección (Estadísticas Originales) */}
                {stats && <UserStatsGrid stats={stats} />}

                {/* 2. Segunda sección (Generador Dinámico debajo) */}
                <DynamicReportBuilder />
            </div>
        </div>
    )
}