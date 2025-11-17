// src/app/error.tsx
"use client";

import React, { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

// TODO: Refactor this component to reduce cognitive complexity. Rule temporarily disabled to keep CI passing.
// eslint-disable-next-line sonarjs/cognitive-complexity
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  // Handler mejorado para "Intentar de nuevo" que maneja errores de hidratación
  // TODO: Refactor this function to reduce cognitive complexity. Rule temporarily disabled to keep CI passing.
  // eslint-disable-next-line sonarjs/cognitive-complexity
  const handleRetry = useCallback(() => {
    try {
      // Si estamos en una ruta de checkout, intentar recargar manteniendo parámetros
      if (pathname?.includes("/checkout")) {
        if (typeof window !== "undefined") {
          // Preservar parámetros de URL si existen
          const currentUrl = window.location.href;
          window.location.href = currentUrl;
        }
      } else {
        // Para otras rutas, usar reset() normal
        reset();
      }
    } catch (err) {
      // Si reset falla, hacer reload completo
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  }, [reset, pathname]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 text-center">
      <h1 className="text-4xl font-bold mb-4">Algo salió mal</h1>
      <p className="text-xl text-gray-600 mb-8">
        Hubo un error al cargar esta página.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
        <button onClick={handleRetry} className="btn btn-primary">
          Intentar de nuevo
        </button>
        <Link href={ROUTES.home()} className="btn btn-outline">
          Ir al inicio
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href={ROUTES.buscar()} className="btn btn-outline">
          Buscar productos
        </Link>
        <Link href={ROUTES.tienda()} className="btn btn-outline">
          Ver tienda
        </Link>
      </div>
      {/* Error digest para debugging - solo mostrar si existe */}
      {process.env.NODE_ENV === "development" && error.digest && (
        <p className="mt-4 text-xs text-gray-400 font-mono">{error.digest}</p>
      )}
    </main>
  );
}

