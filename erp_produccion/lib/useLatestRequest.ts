'use client'

import { useCallback, useRef } from 'react'

export default function useLatestRequest() {
    const versions = useRef<Record<string, number>>({})

    return useCallback((key = 'default') => {
        const version = (versions.current[key] || 0) + 1
        versions.current[key] = version

        return () => versions.current[key] === version
    }, [])
}
