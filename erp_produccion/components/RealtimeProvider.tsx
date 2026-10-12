'use client'

import { useEffect } from 'react'
import { io } from 'socket.io-client'

export default function RealtimeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const socket = io({
            path: '/socket.io',
            transports: ['websocket', 'polling'],
        })

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

        return () => {
            socket.disconnect()
        }
    }, [])

    return children
}
