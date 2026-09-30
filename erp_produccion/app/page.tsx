'use client'

import LoginCarousel, { CarouselSlide } from "@/components/LoginCarousel"
import LoginForm from "@/components/LoginForm";
import { useState } from "react";
import { useRouter } from "next/navigation";

const companySlides: CarouselSlide[] = [
  {
    id: 1,
    title: "Nuestra Visión",
    description: "Ser el referente tecnológico líder, impulsando la transformación digital con soluciones ágiles y eficientes.",
    iconName: "lucide:view",
  },
  {
    id: 2,
    title: "Nuestra Misión",
    description: "Simplificar la gestión operativa de cada colaborador mediante herramientas intuitivas y de alto rendimiento.",
    iconName: "lucide:target",
  },
  {
    id: 3,
    title: "Nuestros Valores",
    description: "Integridad, compromiso, innovación constante y trabajo en equipo guiando cada uno de nuestros pasos.",
    iconName: "lucide:heart-handshake",
  },
];

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()

  const handleLoginSubmit = async (employeeId: string) => {
    setErrorMessage("")

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || data.menssage || "Ocurrió un error al iniciar sesión")
        return
      }

      console.log("Usuario autenticado:", data.user)
      const tipo = data.user.tipo_usuario?.trim()

      // Redirección basada en el tipo de usuario obtenido de la BD
      if (tipo === 'Administrador') {
        router.push('/admin')
      } else if (tipo === 'Administrador_Costura') {
        router.push('/admin_costura/ordenes')
      } else if (tipo === 'Operador') {
        router.push('/operador')
      } else {
        router.push('/dashboard')
      }

      router.refresh()

    } catch (error) {
      console.error("Error de red:", error)
      setErrorMessage("No se pudo conectar con el servidor")
    }
  }

  return (
    <main className="grid grid-cols-1 lg:grid-cols-2 h-screen w-screen overflow-hidden bg-white relative">
      <LoginCarousel
        slides={companySlides}
        logoSrc="/logo.webp"
        appName="PRODUCCION"
      />

      <div className="flex flex-col justify-center relative">
        {errorMessage && (
          <div className="absolute top-6 right-6 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-xs font-medium shadow-sm">
            {errorMessage}
          </div>
        )}

        <LoginForm
          title="Acceso Corporativo"
          subtitle="Introduce tu identificación de empleado para continuar."
          inputLabel="ID de Empleado"
          inputPlaceholder="Ej. 10492"
          buttonText="Ingresar al sistema"
          inputIconName="lucide:user"
          onSubmit={handleLoginSubmit}
        />
      </div>
    </main>
  )
}
