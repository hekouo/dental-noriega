"use client";

import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/**
 * Skeleton loader para item de sugerencia de búsqueda
 * Simula un item con thumbnail + 2 líneas (título + precio)
 * Respeto prefers-reduced-motion: si está activado, usa pulse más suave
 */
export default function SkeletonSearchItem() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Thumbnail skeleton - tamaño fijo 48x48 */}
        <div
          className={`w-12 h-12 bg-gray-200 rounded border border-gray-200 flex-shrink-0 ${
            prefersReducedMotion ? "" : "animate-pulse"
          }`}
        />
        {/* Contenido: 2 líneas */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Título - línea completa */}
          <div
            className={`h-4 bg-gray-200 rounded ${
              prefersReducedMotion ? "" : "animate-pulse"
            }`}
            style={{ width: "90%" }}
          />
          {/* Precio - línea más corta */}
          <div
            className={`h-3 bg-gray-200 rounded ${
              prefersReducedMotion ? "" : "animate-pulse"
            }`}
            style={{ width: "40%" }}
          />
        </div>
      </div>
    </div>
  );
}
