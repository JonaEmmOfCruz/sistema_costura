'use client'

import { useEffect, useState } from "react"
import { Icon } from "@iconify/react"
import ReusableTable from "@/components/ReusableTable"

export default function SubirManualesPage() {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
    const [manuales, setManuales] = useState([])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setStatus(null)
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        if(e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0])
            setStatus(null)
        }
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        setStatus(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/manuales/subir', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setStatus({ type: 'success', message: data.message })
                setFile(null)
                cargarManuales() // Recargar la tabla
            } else {
                setStatus({ type: 'error', message: data.message || 'Error al subir el archivo' })
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Error de conexión con el servidor' })
        } finally {
            setLoading(false)
        }
    }

    const cargarManuales = () => {
        setLoading(true)
        fetch('/api/manuales')
            .then(res => res.json())
            .then(data => {
                if (data.success) setManuales(data.manuales)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }

    useEffect(() => {
        cargarManuales()
    }, [])

    const columns = [
        { header: 'Nombre del Archivo', accessorKey: 'nombre_original' },
        { header: 'Tipo', accessorKey: 'tipo' },
        { 
            header: 'Tamaño', 
            accessorKey: (row: any) => `${(row.tamanio / 1024).toFixed(2)} KB` 
        },
        { 
            header: 'Fecha de Subida', 
            accessorKey: (row: any) => row.fecha_subida ? new Date(row.fecha_subida).toLocaleString() : '-' 
        },
        {
            header: 'Acciones',
            accessorKey: (row: any) => (
                <a 
                    href={row.ruta} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium text-xs transition-colors"
                >
                    <Icon icon="lucide:eye" className="text-base" /> Ver Manual
                </a>
            )
        }
    ]

    return (
        <div className="mx-auto space-y-6">
            <div className="pt-4">
                <h1 className="text-2xl font-bold text-gray-800">Carga de Manuales de Producción</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Sube manuales explicativos en formato PDF, PNG o JPG para el área de operaciones.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div onDrop={handleDrop} onDragOver={handleDragOver} className="border-2 border-dashed border-gray-200 hover:border-slate-500 transition-colors rounded-3xl p-10 text-center bg-slate-50 shadow-sm relative cursor-pointer group">
                    <input 
                        type="file" 
                        accept=".pdf, .png, .jpg, .jpeg" 
                        onChange={handleFileChange} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-14 h-14 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Icon icon="lucide:file-text" className="text-3xl"/>
                        </div>

                        {file ? (
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Archivo listo para cargar</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm font-medium text-gray-700">
                                    Arrastra tu archivo aquí, o <span className="text-slate-600 uppercase">busca en tu equipo</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Formatos soportados: .pdf, .png, .jpg, .jpeg</p>
                            </div>
                        )}

                    </div>
                </div>

                {status && (
                    <div className={`p-4 rounded-2xl text-sm flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        <Icon icon={status.type === 'success' ? "lucide:check-circle" : "lucide:alert-circle"} className="text-xl shrink-0" />
                        <span>{status.message}</span>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={!file || loading}
                    className="w-full bg-slate-900 text-white p-3.5 rounded-2xl font-medium hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                >
                    {loading ? (
                        <>
                            <Icon icon="lucide:loader-2" className="text-xl animate-spin" />
                            <span>Guardando manual...</span>
                        </>
                    ) : (
                        <>
                            <Icon icon="lucide:upload-cloud" className="text-xl" />
                            <span>Subir Manual</span>
                        </>
                    )}
                </button>
            </form>

            <div>
                <ReusableTable data={manuales} columns={columns} searchField='nombre_original' searchPlaceholder="Buscar por nombre de archivo..."/>
            </div>
        </div>
    )
}