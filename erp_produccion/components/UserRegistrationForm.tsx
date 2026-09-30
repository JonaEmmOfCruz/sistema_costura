'use client'

import { useEffect, useState } from "react"

export default function UserRegistrationForm() {
    const [formData, setFormData] = useState({
        numero_empleado: '',
        nombre: '',
        area: 'Costura',
        tipo_usuario: 'Operador',
    })

    const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null) 

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus(null)

        const res = await fetch('/api/usuarios/registrar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(formData)
        })

        const data = await res.json()

        if (data.succes) {
            setStatus({type: 'success', message: 'Usuario registrado exitosamente'})
            setFormData({numero_empleado: '', nombre: '', area: 'Armado', tipo_usuario: 'Operador'})
        } else {
            setStatus({type: 'error', message: data.message})
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-2xl border border-gray-100">
            {status && (
                <div className={`p-3 rounded-xl text-sm ${status.type === 'success'} ? 'bg-green-50 text-green-700' : ''bg-red-50 text-red-700`}>
                    {status.message}
                </div>
            )}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Registro de Usuarios</h1>
            </div>

            <div className="pt-8">
                <label className="block text-sm font-medium text-gray-700">Número de empleado</label>
                <input
                    type="text"
                    className="mt-1 block w-full border-b border-gray-300 p-2 text-gray-500"
                    onChange={(e) => setFormData({ ...formData, numero_empleado: e.target.value })}
                    required
                />
            </div>
            <div className="pt-8">
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                    type="text"
                    className="mt-1 block w-full border-b border-gray-300 p-2 text-gray-500"
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-8">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Área</label>
                    <select className="mt-1 block w-full border-b border-gray-300 p-2 text-gray-500" onChange={(e) => setFormData({ ...formData, area: e.target.value })}>
                        <option>Selecciona una área</option>
                        <option value="Armado">Armado</option>
                        <option value="Costura">Costura</option>
                        <option value="Montado">Montado</option>
                        <option value="Tapizado">Tapizado</option>
                        <option value="Produccion">Produccion</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nivel de Usuario</label>
                    <select className="mt-1 block w-full border-b border-gray-300 p-2 text-gray-500" onChange={(e) => setFormData({ ...formData, tipo_usuario: e.target.value })}>
                        <option>Selecciona el nivel del usuario</option>
                        <option value="Administrador">Administrador</option>
                        <option value="Operador">Operador</option>
                        <option value="Administrador_Costura">Administrador De Costura</option>
                    </select>
                </div>
            </div>

            <button type="submit" className="w-full bg-slate-600 text-white p-3 mt-8 rounded-xl font-medium hover:bg-slate-700">Registrar Usuario</button>
        </form>
    )
}