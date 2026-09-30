// components/LoginCarousel.tsx
"use client";
import { useState, useEffect, ReactNode } from "react";
import { Icon } from "@iconify/react";
import Image from "next/image";

export interface CarouselSlide {
  id: number;
  title: string;
  description: string;
  iconName: string; // Nombre del icono en Iconify (ej. "lucide:compass")
}

interface LoginCarouselProps {
  slides: CarouselSlide[];
  logoSrc: string;
  appName: string;
}

export default function LoginCarousel({
  slides,
  logoSrc,
  appName,
}: LoginCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Cambio automático del carrusel cada 1 segundo
  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 1000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="hidden lg:flex flex-col justify-between h-full bg-neutral-100 p-12 border-r border-neutral-200">
      {/* Logo Grande superior */}
      <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl flex items-center justify-center">
                <Image
                    src={logoSrc}
                    alt={appName}
                    width={140}
                    height={140}
                    className="object-contain"
                />
            </div>
            
            <div className="h-8 w-[1px] bg-neutral-300"></div>

            <span className="font-semibold text-lg tracking-tight text-neutral-900">
                {appName}
            </span>
      </div>

      {/* Carrusel Central (Visión, Misión, Valores) */}
      <div className="my-auto max-w-md mx-auto w-full">
        <div className="transition-all duration-700 ease-in-out">
          <div className="mb-6 p-4 bg-white rounded-2xl shadow-sm border border-neutral-200 inline-block">
            <Icon icon={slides[currentSlide].iconName} className="w-8 h-8 text-neutral-700" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-900 mb-3">
            {slides[currentSlide].title}
          </h2>
          <p className="text-neutral-500 leading-relaxed text-base">
            {slides[currentSlide].description}
          </p>
        </div>

        {/* Indicadores de Puntos */}
        <div className="flex gap-2 mt-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                currentSlide === index ? "w-8 bg-neutral-900" : "w-2 bg-neutral-300"
              }`}
              aria-label={`Ir a slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Footer minimalista */}
      <p className="text-xs text-neutral-400">
        © {new Date().getFullYear()} {appName}. Todos los derechos reservados.
      </p>
    </div>
  );
}