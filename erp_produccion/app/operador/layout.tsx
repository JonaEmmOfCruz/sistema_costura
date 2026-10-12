'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header' // Asegúrate de que esta ruta sea la correcta

export default function OperadorLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<{ nombre: string, tipo_usuario: string } | null>(null)
    const [estado, setEstado] = useState<'loading' | 'ready' | 'error'>('loading')
    const [mensajeError, setMensajeError] = useState('')
    const [intento, setIntento] = useState(0)
    const router = useRouter()

    useEffect(() => {
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), 10000)
        let mounted = true

        const verificarSesion = async () => {
            try {
                const res = await fetch('/api/me', {
                    cache: 'no-store',
                    signal: controller.signal,
                })
                const data = await res.json()

                if (res.ok && data.success && data.user) {
                    if (!mounted) return
                    setUser(data.user)
                    setEstado('ready')
                } else if (res.status === 401) {
                    router.replace('/')
                } else {
                    throw new Error(data.message || 'No se pudo verificar la sesión.')
                }
            } catch (error) {
                if (!mounted) return
                if (controller.signal.aborted) {
                    setMensajeError('La verificación de sesión tardó demasiado. Comprueba la conexión con el servidor e inténtalo de nuevo.')
                } else {
                    console.error("Error al verificar sesión:", error)
                    setMensajeError('No se pudo verificar la sesión. Comprueba la conexión e inténtalo de nuevo.')
                }
                setEstado('error')
            }
        }

        void verificarSesion()
        return () => {
            mounted = false
            window.clearTimeout(timeout)
            controller.abort()
        }
    }, [router, intento])

    if (estado === 'loading') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <span className="text-sm font-medium text-slate-500 animate-pulse">Cargando estación...</span>
            </div>
        )
    }

    if (estado === 'error' || !user) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-sm font-medium text-red-700">{mensajeError}</p>
                <button
                    type="button"
                    onClick={() => {
                        setMensajeError('')
                        setEstado('loading')
                        setIntento((actual) => actual + 1)
                    }}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                >
                    Reintentar
                </button>
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