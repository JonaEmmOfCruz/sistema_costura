'use client'

import { useEffect, useRef } from 'react'

export default function useRealtimeRefresh(refresh: () => void | Promise<void>) {
    const refreshRef = useRef(refresh)
    const refreshState = useRef({ running: false, pending: false })
    const refreshTimer = useRef<number | null>(null)

    useEffect(() => {
        refreshRef.current = refresh
    }, [refresh])

    useEffect(() => {
        const runRefresh = async () => {
            if (refreshState.current.running) {
                refreshState.current.pending = true
                return
            }

            refreshState.current.running = true
            do {
                refreshState.current.pending = false
                try {
                    await refreshRef.current()
                } catch (error) {
                    console.error('Error al actualizar datos en tiempo real:', error)
                }
            } while (refreshState.current.pending)

            refreshState.current.running = false
        }

        const handleDataChanged = () => {
            if (refreshTimer.current !== null) {
                window.clearTimeout(refreshTimer.current)
            }
            refreshTimer.current = window.setTimeout(() => {
                refreshTimer.current = null
                void runRefresh()
            }, 100)
        }

        window.addEventListener('app:data-changed', handleDataChanged)
        return () => {
            window.removeEventListener('app:data-changed', handleDataChanged)
            if (refreshTimer.current !== null) {
                window.clearTimeout(refreshTimer.current)
                refreshTimer.current = null
            }
        }
    }, [])
}
