"use client";

import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

export default function ProductCardSkeleton() {
  const prefersReducedMotion = usePrefersReducedMotion();

  const skeletonClass = prefersReducedMotion ? "bg-gray-200" : "shimmer-silk";

  return (
    <div className="rounded-2xl border border-gray-200 p-3 flex flex-col bg-white">
      <div className={`relative w-full aspect-square rounded-lg ${skeletonClass}`} />
      <div className="mt-2 space-y-2">
        <div className={`h-4 rounded w-3/4 ${skeletonClass}`} />
        <div className={`h-4 rounded w-1/2 ${skeletonClass}`} />
      </div>
      <div className={`mt-1 h-5 rounded w-20 ${skeletonClass}`} />
      <div className="mt-auto pt-2">
        <div className={`h-10 rounded-lg ${skeletonClass}`} />
      </div>
    </div>
  );
}

