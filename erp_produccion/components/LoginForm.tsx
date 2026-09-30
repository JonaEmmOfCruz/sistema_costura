'use client'

import { useState, FormEvent } from "react"
import { Icon } from "@iconify/react"

interface LoginFormProps {
    title?: string;
    subtitle?: string;
    inputLabel?: string;
    inputPlaceholder?: string;
    buttonText?: string;
    inputIconName?: string;
    helpLinkText?: string;
    helpLinkHref?: string;
    onSubmit: (employeeId: string) => void;
}

export default function LoginForm({
    title = "Bienvenido de nuevo",
    subtitle = "Ingresa tu número de empleado para acceder al sistema",
    inputLabel = "Número de Empleado",
    inputPlaceholder = "Ej. 123",
    buttonText = "Ingresar al sistema",
    inputIconName = "lucide:user",
    helpLinkText = "¿Problemas para iniciar sesión? Reportalo con Producción",
    helpLinkHref = "#",
    onSubmit,
}: LoginFormProps) {
    const [employeeId, setEmployeeId] = useState("")

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        onSubmit(employeeId)
    }

    return (
        <div className="flex flex-col justify-center items-center h-full bg-white p-8 sm:p-12 lg:p-16">
            <div className="w-full max-w-sm mx-auto space-y-8">
                {/* Cabecera del formulario */}
                <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                        {title}
                    </h1>
                    <p className="text-sm text-neutral-500">
                        {subtitle}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="employeeId" className="block text-xs font-medium uppercase tracking-wider text-neutral-600">{inputLabel}</label>

                        <div className="relative">
                            {inputIconName && (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400 placeholder-neutral-400 text-sm focus:outline-none focus:bg-white focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all duration-200">
                                    <Icon icon={inputIconName} className="w-4 h-4"/>
                                </span>
                            )}

                            <input
                                id="employeedId"
                                type="text"
                                required
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                placeholder={inputPlaceholder}
                                className={`w-full ${inputIconName ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900`}
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow active:scale-[0.99]"><span>{buttonText}</span></button>
                </form>

                <div className="text-center">
                    <a href={helpLinkHref} className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors">{helpLinkText}</a>
                </div>


            </div>
        </div>
    )
}