'use client'

import { useEffect, useRef } from 'react'

export default function useRealtimeRefresh(refresh: () => void | Promise<void>) {
    const refreshRef = useRef(refresh)

    useEffect(() => {
        refreshRef.current = refresh
    }, [refresh])

    useEffect(() => {
        const handleDataChanged = () => {
            void refreshRef.current()
        }

        window.addEventListener('app:data-changed', handleDataChanged)
        return () => window.removeEventListener('app:data-changed', handleDataChanged)
    }, [])
}
