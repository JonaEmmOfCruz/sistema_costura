'use client'

import { useState, useMemo } from "react"
import { Icon } from "@iconify/react"

interface Column<T> {
    header: React.ReactNode; 
    accessorKey: keyof T | ((row: T) => React.ReactNode);
    className?: string;
}

interface ReusableTableProps<T> {
    data: T[];
    columns: Column<T>[];
    searchField?: keyof T | string | boolean; // Mantenemos la prop para no romper otras vistas
    searchPlaceholder?: string;
}

export default function ReusableTable<T extends Record<string, any>>({
    data = [], 
    columns,
    searchField,
    searchPlaceholder = "Buscar en toda la tabla..."
}: ReusableTableProps<T>) {
    const [searchTerm, setSearchTerm] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [rowsPerPage, setRowsPerPage] = useState(5)

    // Filtrar datos de forma segura en TODAS las columnas
    const filteredData = useMemo(() => {
        const safeData = Array.isArray(data) ? data : []
        if (!searchTerm) return safeData

        const term = searchTerm.toLowerCase()

        return safeData.filter((item) => {
            // Iteramos sobre todos los valores del objeto/fila en lugar de un solo campo
            return Object.values(item).some(value => {
                if (value == null) return false
                return String(value).toLowerCase().includes(term)
            })
        })
    }, [data, searchTerm])

    // Calcular paginación de manera segura
    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage
        return filteredData.slice(start, start + rowsPerPage)
    }, [filteredData, currentPage, rowsPerPage])

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Cabecera con Buscador y Selector de Filas */}
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                {searchField !== undefined && (
                    <div className="relative w-full sm:w-72">
                        <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value)
                                setCurrentPage(1)
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-500 w-full sm:w-auto justify-end">
                    <span>Mostrar:</span>
                    <select
                        value={rowsPerPage}
                        onChange={(e) => {
                            setRowsPerPage(Number(e.target.value))
                            setCurrentPage(1)
                        }}
                        className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-500 font-medium"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                    <span>filas</span>
                </div>
            </div>

            {/* Tabla Minimalista */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                            {columns.map((col, index) => (
                                <th 
                                    key={index}
                                    className={`py-3.5 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider ${col.className || ''}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm text-gray-600">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="hover:bg-gray-50/50 transition-colors">
                                    {columns.map((col, colIndex) => {
                                        const content = typeof col.accessorKey === 'function'
                                            ? col.accessorKey(row)
                                            : row[col.accessorKey as keyof T];
                                        return (
                                            <td key={colIndex} className={`py-4 px-6 ${col.className || ''}`}>
                                                {content as React.ReactNode ?? '-'}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className="py-12 text-center text-gray-400 text-sm">
                                    No se encontraron registros
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginador Inferior */}
            <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
                <div>
                    Mostrando <span className="font-semibold text-gray-700">{filteredData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</span> a <span className="font-semibold text-gray-700">{Math.min(currentPage * rowsPerPage, filteredData.length)}</span> de <span className="font-semibold text-gray-700">{filteredData.length}</span> resultados
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
                    >
                        <Icon icon="lucide:chevron-left" className="text-base" />
                    </button>
                    
                    <span className="px-3 py-1 font-medium text-gray-700">
                        Página {currentPage} de {totalPages || 1}
                    </span>

                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
                    >
                        <Icon icon="lucide:chevron-right" className="text-base" />
                    </button>
                </div>
            </div>
        </div>
    )
}