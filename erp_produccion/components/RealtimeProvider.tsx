'use client'

import { useEffect } from 'react'

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        let disposed = false
        let disconnect: (() => void) | undefined

        void import('socket.io-client')
            .then(({ io }) => {
                if (disposed) return

                const socket = io({
                    path: '/socket.io',
                    transports: ['websocket', 'polling'],
                })
                disconnect = () => socket.disconnect()

                socket.on('connect', () => {
                    window.dispatchEvent(new CustomEvent('app:data-changed', {
                        detail: { path: '*', method: 'CONNECT' },
                    }))
                })

                socket.on('data:changed', (change: { path: string; method: string }) => {
                    window.dispatchEvent(new CustomEvent('app:data-changed', { detail: change }))
                })

                socket.on('connect_error', (error) => {
                    console.error('No se pudo conectar con las actualizaciones en tiempo real:', error.message)
                })
            })
            .catch((error: unknown) => {
                console.error('No se pudo cargar la conexión de actualizaciones en tiempo real:', error)
            })

        return () => {
            disposed = true
            disconnect?.()
        }
    }, [])

    return children
}
