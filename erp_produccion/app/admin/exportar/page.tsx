'use client'

import { Icon } from "@iconify/react"
import { useEffect, useState } from "react"

interface ExportTable {
    name: string
    columns: string[]
    rows: unknown[][]
    totalRows?: number
}

interface ExportPayload {
    success: boolean
    message?: string
    tables?: ExportTable[]
    generatedAt?: string
}

type ExportFormat = 'excel' | 'pdf'
type ExportMode = 'general' | 'fechas'

function displayTableName(name: string) {
    return name
        .replace(/^admin_costura_/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase())
}

function displayColumnName(name: string) {
    if (name === 'id_operador') return 'Nombre del Operador'
    return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, letter => letter.toUpperCase())
}

function cellText(value: unknown) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
}

function excelCellValue(value: unknown): string | number | boolean | null {
    if (value === null || value === undefined) return null
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
    return JSON.stringify(value)
}

async function loadCompanyLogo() {
    const image = new Image()
    image.src = '/logo.webp'
    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('No se pudo cargar el logo de la empresa'))
    })

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No se pudo preparar el logo para exportación')
    context.drawImage(image, 0, 0)
    return {
        dataUrl: canvas.toDataURL('image/png'),
        aspectRatio: image.naturalHeight / image.naturalWidth,
    }
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function dateForFilename() {
    return new Date().toISOString().slice(0, 10)
}

export default function AdminDataExportPage() {
    const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null)
    const [loadingTable, setLoadingTable] = useState<string | null>(null)
    const [exportMode, setExportMode] = useState<ExportMode>('general')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [tables, setTables] = useState<ExportTable[]>([])
    const [generatedAt, setGeneratedAt] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState('')

    useEffect(() => {
        const controller = new AbortController()
        const params = new URLSearchParams({ resumen: '1' })
        if (exportMode === 'fechas' && dateFrom && dateTo) {
            params.set('desde', dateFrom)
            params.set('hasta', dateTo)
        }

        fetch(`/api/admin/exportar?${params.toString()}`, {
            cache: 'no-store',
            signal: controller.signal,
        })
            .then(async response => {
                const payload = await response.json() as ExportPayload
                if (!response.ok || !payload.success || !payload.tables) {
                    throw new Error(payload.message || 'No se pudo cargar el resumen de las tablas')
                }
                setTables(payload.tables)
                setGeneratedAt(payload.generatedAt ?? new Date().toISOString())
                setErrorMessage('')
            })
            .catch(error => {
                if (error instanceof Error && error.name === 'AbortError') return
                console.error('Error al cargar el resumen de exportación:', error)
                setErrorMessage(error instanceof Error ? error.message : 'No se pudo cargar el resumen de las tablas')
            })

        return () => controller.abort()
    }, [dateFrom, dateTo, exportMode])

    async function fetchDatabaseData(tableName?: string) {
        const params = new URLSearchParams()
        if (tableName) params.set('tabla', tableName)
        if (exportMode === 'fechas') {
            params.set('desde', dateFrom)
            params.set('hasta', dateTo)
        }
        const query = params.size ? `?${params.toString()}` : ''
        const response = await fetch(`/api/admin/exportar${query}`, { cache: 'no-store' })
        const payload = await response.json() as ExportPayload
        if (!response.ok || !payload.success || !payload.tables) {
            throw new Error(payload.message || 'No se pudo obtener la información de la base de datos')
        }
        if (!tableName) {
            setTables(payload.tables)
            setGeneratedAt(payload.generatedAt ?? new Date().toISOString())
        }
        return payload.tables
    }

    async function exportExcel(tableName?: string) {
        const [{ Workbook }, logo] = await Promise.all([
            import('exceljs'),
            loadCompanyLogo(),
        ])
        const currentTables = await fetchDatabaseData(tableName)
        const workbook = new Workbook()
        workbook.creator = 'Sistema de Producción'
        workbook.created = new Date()
        workbook.subject = 'Exportación de información de la base de datos'
        workbook.title = 'Información de producción'

        const logoId = workbook.addImage({
            base64: logo.dataUrl,
            extension: 'png',
        })

        for (const table of currentTables) {
            const worksheet = workbook.addWorksheet(table.name)
            worksheet.views = [{ state: 'frozen', ySplit: 6 }]
            worksheet.addImage(logoId, 'A1:B5')
            worksheet.mergeCells('C1:G2')
            worksheet.getCell('C1').value = displayTableName(table.name)
            worksheet.getCell('C1').font = { bold: true, size: 18, color: { argb: 'FF1E293B' } }
            worksheet.getCell('C1').alignment = { vertical: 'middle' }
            worksheet.mergeCells('C3:G3')
            worksheet.getCell('C3').value = `Registros: ${table.rows.length}`
            worksheet.getCell('C3').font = { size: 10, color: { argb: 'FF64748B' } }

            const headerRow = worksheet.getRow(6)
            headerRow.values = table.columns.map(displayColumnName)
            headerRow.height = 24
            headerRow.eachCell(cell => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
                cell.alignment = { vertical: 'middle', wrapText: true }
                cell.border = { bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } }
            })

            for (const values of table.rows) {
                const row = worksheet.addRow(values.map(excelCellValue))
                row.eachCell({ includeEmpty: true }, cell => {
                    cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
                    cell.alignment = { vertical: 'top', wrapText: true }
                })
            }

            worksheet.autoFilter = {
                from: { row: 6, column: 1 },
                to: { row: Math.max(6, table.rows.length + 6), column: Math.max(1, table.columns.length) },
            }

            worksheet.columns = table.columns.map((column, index) => {
                const longestValue = table.rows.reduce((longest, row) => {
                    return Math.max(longest, cellText(row[index]).length)
                }, column.length)
                return { width: Math.max(12, Math.min(36, longestValue + 2)) }
            })
        }

        const buffer = await workbook.xlsx.writeBuffer()
        downloadBlob(
            new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `exportacion-${tableName || 'produccion'}-${exportMode === 'fechas' ? `${dateFrom}-${dateTo}` : 'general'}-${dateForFilename()}.xlsx`,
        )
    }

    async function exportPdf(tableName?: string) {
        const [{ jsPDF }, { autoTable }, logo] = await Promise.all([
            import('jspdf'),
            import('jspdf-autotable'),
            loadCompanyLogo(),
        ])
        const currentTables = await fetchDatabaseData(tableName)
        const pdfDocument = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const logoWidth = 34
        const logoHeight = logoWidth * logo.aspectRatio
        let cursorY = 29

        const drawPageHeader = () => {
            pdfDocument.addImage(logo.dataUrl, 'PNG', 10, 5, logoWidth, logoHeight)
            pdfDocument.setFont('helvetica', 'bold')
            pdfDocument.setFontSize(10)
            pdfDocument.setTextColor(30, 41, 59)
            pdfDocument.text('Exportación de información de producción', 48, 12)
            pdfDocument.setFont('helvetica', 'normal')
            pdfDocument.setFontSize(7)
            pdfDocument.setTextColor(100, 116, 139)
            pdfDocument.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 48, 18)
        }

        drawPageHeader()
        for (const [index, table] of currentTables.entries()) {
            if (cursorY > pdfDocument.internal.pageSize.getHeight() - 32) {
                pdfDocument.addPage()
                drawPageHeader()
                cursorY = 29
            }

            pdfDocument.setFont('helvetica', 'bold')
            pdfDocument.setFontSize(10)
            pdfDocument.setTextColor(30, 41, 59)
            pdfDocument.text(`${index + 1}. ${displayTableName(table.name)} (${table.rows.length} registros)`, 10, cursorY)

            autoTable(pdfDocument, {
                startY: cursorY + 3,
                head: [table.columns.map(displayColumnName)],
                body: table.rows.map(row => row.map(cellText)),
                theme: 'plain',
                margin: { top: 24, right: 10, bottom: 12, left: 10 },
                showHead: 'everyPage',
                styles: {
                    font: 'helvetica',
                    fontSize: 6,
                    cellPadding: 1.2,
                    overflow: 'linebreak',
                    textColor: [31, 41, 55],
                },
                headStyles: {
                    fillColor: [30, 58, 95],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                didParseCell: data => {
                    data.cell.styles.lineWidth = { top: 0, right: 0, bottom: 0.15, left: 0 }
                    data.cell.styles.lineColor = [203, 213, 225]
                },
                didDrawPage: drawPageHeader,
            })
            const lastTable = (pdfDocument as typeof pdfDocument & { lastAutoTable?: { finalY: number } }).lastAutoTable
            cursorY = (lastTable?.finalY ?? cursorY + 10) + 10
        }

        pdfDocument.save(`exportacion-${tableName || 'produccion'}-${exportMode === 'fechas' ? `${dateFrom}-${dateTo}` : 'general'}-${dateForFilename()}.pdf`)
    }

    async function handleExport(format: ExportFormat, tableName?: string) {
        if (exportMode === 'fechas') {
            if (!dateFrom || !dateTo) {
                setErrorMessage('Selecciona la fecha inicial y final para exportar por fechas.')
                return
            }
            if (dateFrom > dateTo) {
                setErrorMessage('La fecha inicial no puede ser posterior a la fecha final.')
                return
            }
        }

        setLoadingFormat(format)
        setLoadingTable(tableName ?? null)
        setErrorMessage('')
        try {
            if (format === 'excel') await exportExcel(tableName)
            else await exportPdf(tableName)
        } catch (error) {
            console.error(`Error al exportar ${format}:`, error)
            setErrorMessage(error instanceof Error ? error.message : 'Ocurrió un error durante la exportación')
        } finally {
            setLoadingFormat(null)
            setLoadingTable(null)
        }
    }

    const isLoading = loadingFormat !== null

    return (
        <section className="mx-auto max-w-6xl space-y-6">
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <Icon icon="lucide:database" className="text-2xl" />
                    </span>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Exportación de datos</h1>
                        <p className="mt-1 text-sm text-gray-500">Descarga la información almacenada en la base de datos.</p>
                    </div>
                </div>
            </header>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="space-y-5">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800">Exportar información</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Elige una exportación general o limita la información al rango de fechas seleccionado.
                            Puedes exportar todas las tablas desde aquí o descargar cada tabla desde su propia fila.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                            Por seguridad, se omiten la tabla de sesiones y cualquier campo de autenticación.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                            <button
                                type="button"
                                aria-pressed={exportMode === 'general'}
                                onClick={() => setExportMode('general')}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition ${exportMode === 'general' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                General
                            </button>
                            <button
                                type="button"
                                aria-pressed={exportMode === 'fechas'}
                                onClick={() => setExportMode('fechas')}
                                className={`rounded-md px-3 py-2 text-sm font-medium transition ${exportMode === 'fechas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Por fechas
                            </button>
                        </div>
                        {exportMode === 'fechas' && (
                            <>
                                <label className="grid gap-1 text-xs font-medium text-slate-500">
                                    Desde
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        onChange={event => setDateFrom(event.target.value)}
                                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                                    />
                                </label>
                                <label className="grid gap-1 text-xs font-medium text-slate-500">
                                    Hasta
                                    <input
                                        type="date"
                                        value={dateTo}
                                        onChange={event => setDateTo(event.target.value)}
                                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                                    />
                                </label>
                            </>
                        )}
                        <div className="ml-auto flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => handleExport('excel')}
                                disabled={isLoading}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loadingFormat === 'excel' && !loadingTable
                                    ? <Icon icon="lucide:loader-circle" className="animate-spin text-lg" />
                                    : <Icon icon="lucide:sheet" className="text-lg" />}
                                Exportar todo a Excel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleExport('pdf')}
                                disabled={isLoading}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loadingFormat === 'pdf' && !loadingTable
                                    ? <Icon icon="lucide:loader-circle" className="animate-spin text-lg" />
                                    : <Icon icon="lucide:file-text" className="text-lg" />}
                                Exportar todo a PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {errorMessage && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <Icon icon="lucide:circle-alert" className="mt-0.5 shrink-0 text-lg" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {tables.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-1 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-semibold text-slate-800">Información incluida</h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Última lectura: {generatedAt ? new Date(generatedAt).toLocaleString('es-MX') : ''}
                            </p>
                        </div>
                        <span className="text-sm text-slate-500">{tables.length} tablas</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {tables.map(table => (
                            <div key={table.name} className="flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center">
                                <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{displayTableName(table.name)}</span>
                                <span className="text-xs text-slate-500 sm:w-48 sm:text-right">
                                    {(table.totalRows ?? table.rows.length).toLocaleString('es-MX')} registros · {table.columns.length} columnas
                                </span>
                                <div className="flex items-center gap-2 sm:ml-4">
                                    <button
                                        type="button"
                                        title={`Exportar ${displayTableName(table.name)} a Excel`}
                                        aria-label={`Exportar ${displayTableName(table.name)} a Excel`}
                                        onClick={() => handleExport('excel', table.name)}
                                        disabled={isLoading}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {loadingFormat === 'excel' && loadingTable === table.name
                                            ? <Icon icon="lucide:loader-circle" className="animate-spin text-sm" />
                                            : <Icon icon="lucide:sheet" className="text-sm" />}
                                        Excel
                                    </button>
                                    <button
                                        type="button"
                                        title={`Exportar ${displayTableName(table.name)} a PDF`}
                                        aria-label={`Exportar ${displayTableName(table.name)} a PDF`}
                                        onClick={() => handleExport('pdf', table.name)}
                                        disabled={isLoading}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {loadingFormat === 'pdf' && loadingTable === table.name
                                            ? <Icon icon="lucide:loader-circle" className="animate-spin text-sm" />
                                            : <Icon icon="lucide:file-text" className="text-sm" />}
                                        PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    )
}
