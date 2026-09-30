'use client'

import { useEffect, useState } from "react"

import UserRegistrationForm from "@/components/UserRegistrationForm"
import ReusableTable from "@/components/ReusableTable"

export default function AdminRegisterUser() {
    const [loading, setLoading] = useState(true)
    const [user, setUsers] = useState<any[]>([])
    
    // Estado para editar usuario
    const [selectedUser, setSelectedUser] = useState<any | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Cargar usuarios
    const fetchUsers = () => {
        setLoading(true)
        fetch('/api/usuarios')
            .then(res => res.json())
            .then(data => {
                if (data.success) setUsers(data.user)
                setLoading(false)
            })
            .catch(err => {
                console.error("Error al cargar usuarios:", err)
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    // Handler para eliminar un usuario
    const handleDelete = async (userId: string | number) => {
        const confirmed = window.confirm("¿Estás seguro de que deseas eliminar este usuario?")
        if (!confirmed) return

        try {
            const res = await fetch(`/api/usuarios?id=${userId}`, {
                method: 'DELETE',
            })
            const data = await res.json()

            if (res.ok && data.success) {
                setUsers(prev => prev.filter((u: any) => u.id !== userId && u._id !== userId))
                alert("Usuario eliminado correctamente")
            } else {
                alert(data.message || "Error al eliminar el usuario")
            }
        } catch (error) {
            console.error("Error eliminando usuario:", error)
            alert("Ocurrió un error al intentar eliminar el usuario")
        }
    }

    // Handler para abrir edición
    const handleEditClick = (usuario: any) => {
        setSelectedUser({ ...usuario })
        setIsEditModalOpen(true)
    }

    // Handler para manejar cambios en los campos del modal
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setSelectedUser((prev: any) => ({
            ...prev,
            [name]: value
        }))
    }

    // Handler para guardar la actualización
    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedUser) return

        setIsSaving(true)
        try {
            const res = await fetch('/api/usuarios', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedUser)
            })
            const data = await res.json()

            if (res.ok && data.success) {
                alert("Usuario actualizado con éxito")
                setIsEditModalOpen(false)
                fetchUsers() // Recargar lista
            } else {
                alert(data.message || "Error al actualizar usuario")
            }
        } catch (error) {
            console.error("Error al guardar edición:", error)
            alert("Ocurrió un error al guardar los cambios")
        } finally {
            setIsSaving(false)
        }
    }

    const columns = [
        { header: 'Número de empleado', accessorKey: 'numero_empleado' },
        { header: 'Nombre', accessorKey: 'nombre' },
        { header: 'Área', accessorKey: 'area' },
        {
            header: 'Nivel del usuario',
            accessorKey: (row: any) => {
                const tipo = row.tipo_usuario || ''
                const textoLimpio = tipo.replace(/_/g, ' ')

                return (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {textoLimpio}
                    </span>
                );
            }
        },
        {
            header: 'Acciones',
            accessorKey: (row: any) => {
                const id = row.id || row._id

                return (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleEditClick(row)}
                            className="px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                        >
                            Editar
                        </button>
                        <button
                            onClick={() => handleDelete(id)}
                            className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                        >
                            Eliminar
                        </button>
                    </div>
                )
            }
        }
    ]

    return (
        <div className="space-y-6">
            <UserRegistrationForm />

            <ReusableTable
                data={user}
                columns={columns}
                searchField="nombre"
                searchPlaceholder="Buscar por nombre..."
            />

            {/* Modal de edición */}
            {isEditModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4">
                        <h2 className="text-lg font-bold text-slate-800">
                            Editar Usuario
                        </h2>
                        
                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Número de empleado
                                </label>
                                <input
                                    type="text"
                                    name="numero_empleado"
                                    value={selectedUser.numero_empleado || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={selectedUser.nombre || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Área
                                </label>
                                <input
                                    type="text"
                                    name="area"
                                    value={selectedUser.area || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Nivel / Tipo de usuario
                                </label>
                                <input
                                    type="text"
                                    name="tipo_usuario"
                                    value={selectedUser.tipo_usuario || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}