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
      <div className="relative w-full aspect-square rounded-lg overflow-hidden">
        <div className={`w-full h-full ${prefersReducedMotion ? "bg-gray-200" : "shimmer-silk"}`} />
      </div>

      {/* Título skeleton - 2 líneas, min-h similar a line-clamp-2 */}
      <div className="mt-2 space-y-2 min-h-[2.5rem]">
        <div
          className={`h-4 rounded ${prefersReducedMotion ? "bg-gray-200" : "shimmer-silk"}`}
          style={{ width: "85%" }}
        />
        <div
          className={`h-4 rounded ${prefersReducedMotion ? "bg-gray-200" : "shimmer-silk"}`}
          style={{ width: "60%" }}
        />
      </div>

      {/* Precio skeleton */}
      <div
        className={`mt-2 h-6 rounded w-24 ${prefersReducedMotion ? "bg-gray-200" : "shimmer-silk"}`}
      />

      {/* Badges skeleton - línea de badges pequeños */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <div className={`h-5 rounded-full w-16 ${prefersReducedMotion ? "bg-gray-200" : "shimmer-silk"}`} />
        <div className={`h-5 rounded-full w-20 ${prefersReducedMotion ? "bg-gray-200" : "shimmer-silk"}`} />
      </div>

      {/* Botón skeleton - al final con mt-auto */}
      <div className="mt-auto pt-2">
        <div className={`h-10 rounded-lg ${prefersReducedMotion ? "bg-gray-200" : "shimmer-silk"}`} />
      </div>
    </div>
  );
}
