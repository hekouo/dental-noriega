"use client";

import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/**
 * Skeleton loader para ProductCard
 * Simula una card real con imagen, título, precio y badges
 * Respeto prefers-reduced-motion: si está activado, usa pulse más suave
 */
export default function SkeletonProductCard() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="rounded-2xl border border-gray-200/80 p-3 flex flex-col bg-white shadow-sm">
      {/* Imagen skeleton - aspect-square para mantener dimensiones */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
        {prefersReducedMotion ? (
          <div className="w-full h-full bg-gray-200" />
        ) : (
          <div className="w-full h-full bg-gray-200 animate-pulse" />
        )}
      </div>

      {/* Título skeleton - 2 líneas, min-h similar a line-clamp-2 */}
      <div className="mt-2 space-y-2 min-h-[2.5rem]">
        <div
          className={`h-4 bg-gray-200 rounded ${
            prefersReducedMotion ? "" : "animate-pulse"
          }`}
          style={{ width: "85%" }}
        />
        <div
          className={`h-4 bg-gray-200 rounded ${
            prefersReducedMotion ? "" : "animate-pulse"
          }`}
          style={{ width: "60%" }}
        />
      </div>

      {/* Precio skeleton */}
      <div
        className={`mt-2 h-6 bg-gray-200 rounded w-24 ${
          prefersReducedMotion ? "" : "animate-pulse"
        }`}
      />

      {/* Badges skeleton - línea de badges pequeños */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <div
          className={`h-5 bg-gray-200 rounded-full w-16 ${
            prefersReducedMotion ? "" : "animate-pulse"
          }`}
        />
        <div
          className={`h-5 bg-gray-200 rounded-full w-20 ${
            prefersReducedMotion ? "" : "animate-pulse"
          }`}
        />
      </div>

      {/* Botón skeleton - al final con mt-auto */}
      <div className="mt-auto pt-2">
        <div
          className={`h-10 bg-gray-200 rounded-lg ${
            prefersReducedMotion ? "" : "animate-pulse"
          }`}
        />
      </div>
    </div>
  );
}
