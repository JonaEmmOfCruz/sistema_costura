export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

export function readPageParams(request: Request) {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
    const requestedSize = Number.parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedSize || DEFAULT_PAGE_SIZE))
    return { page, pageSize, offset: (page - 1) * pageSize }
}

export function pageMetadata(page: number, pageSize: number, fetchedRows: number) {
    return {
        page,
        pageSize,
        hasMore: fetchedRows > pageSize,
    }
}

export function pageRows<T>(rows: T[], pageSize: number) {
    return rows.length > pageSize ? rows.slice(0, pageSize) : rows
}
