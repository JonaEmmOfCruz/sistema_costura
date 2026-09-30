'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header' // Asegúrate de que esta ruta sea la correcta

export default function OperadorLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<{ nombre: string, tipo_usuario: string } | null>(null)
    const router = useRouter()

    useEffect(() => {
        // Consultamos la sesión activa del usuario con tu API /api/me
        const verificarSesion = async () => {
            try {
                const res = await fetch('/api/me') 
                const data = await res.json()
                
                if (data.success && data.user) {
                    setUser(data.user)
                } else {
                    router.push('/') // Si falla o expira, regresa al login
                }
            } catch (error) {
                console.error("Error al verificar sesión:", error)
                router.push('/')
            }
        }
        verificarSesion()
    }, [router])

    // Pantalla de carga minimalista mientras obtenemos los datos del usuario
    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <span className="text-sm font-medium text-slate-500 animate-pulse">Cargando estación...</span>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 flex flex-col">
            {/* Aquí agregamos tu componente Header y le pasamos el user */}
            <Header user={user} />

            <main className="p-6 sm:p-10 max-w-4xl mx-auto w-full flex-1">
                {children}
            </main>
        </div>
    )
}