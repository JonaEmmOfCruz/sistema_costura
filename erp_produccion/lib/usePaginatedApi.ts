'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const PAGE_SIZE = 50

export default function usePaginatedApi<T>(endpoint: string, dataKey: string, autoLoad = true) {
    const [data, setData] = useState<T[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const pageRef = useRef(0)
    const requestRef = useRef(0)

    const loadPage = useCallback(async (page: number, append: boolean) => {
        const requestId = ++requestRef.current
        if (append) setLoadingMore(true)
        else if (pageRef.current === 0) setLoading(true)

        try {
            const url = new URL(endpoint, window.location.origin)
            url.searchParams.set('page', String(page))
            url.searchParams.set('pageSize', String(PAGE_SIZE))
            const response = await fetch(url, { cache: 'no-store' })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const result = await response.json()
            if (requestId !== requestRef.current || !result.success || !Array.isArray(result[dataKey])) return

            const rows = result[dataKey] as T[]
            setData(current => append ? [...current, ...rows] : rows)
            pageRef.current = page
            setHasMore(Boolean(result.pagination?.hasMore))
        } catch (error) {
            if (requestId === requestRef.current) {
                console.error(`Error al cargar ${dataKey}:`, error)
                if (!append) setData([])
                setHasMore(false)
            }
        } finally {
            if (requestId === requestRef.current) {
                setLoading(false)
                setLoadingMore(false)
            }
        }
    }, [endpoint, dataKey])

    const reload = useCallback(() => loadPage(1, false), [loadPage])
    const loadMore = useCallback(() => {
        if (!hasMore || loadingMore) return Promise.resolve()
        return loadPage(pageRef.current + 1, true)
    }, [hasMore, loadingMore, loadPage])

    useEffect(() => {
        if (autoLoad) void reload()
        return () => { requestRef.current++ }
    }, [reload, dataKey, autoLoad])

    return { data, setData, loading, loadingMore, hasMore, reload, loadMore }
}
