'use client'

import { useEffect, useState } from "react"

export default function AdminCosturaDashboard() {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

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
                    Panel de administración del área de costura
                </p>
            </div>

            <div className="mt-10 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Órdenes y Procesos de Costura</h2>
                <p className="text-sm text-gray-500">
                    Aquí puedes mostrar las herramientas, tablas de órdenes o subidas de archivos correspondientes a esta área.
                </p>
            </div>
        </div>
    )
}