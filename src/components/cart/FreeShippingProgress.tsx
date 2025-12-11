"use client";

import { getFreeShippingProgress } from "@/lib/shipping/freeShipping";
import { formatMXNFromCents } from "@/lib/utils/currency";

interface FreeShippingProgressProps {
  subtotalCents: number;
  className?: string;
}

/**
 * Componente de barra de progreso para envío gratis
 * Muestra cuánto falta para alcanzar el envío gratis o que ya se alcanzó
 */
export default function FreeShippingProgress({
  subtotalCents,
  className = "",
}: FreeShippingProgressProps) {
  const progress = getFreeShippingProgress(subtotalCents);

  return (
    <div className={`bg-slate-50 rounded-lg border border-slate-200 p-3 ${className}`}>
      {progress.reached ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-green-700 text-center">
            ¡Ya tienes envío gratis en este pedido!
          </p>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: "100%" }}
              aria-hidden="true"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-700 text-center">
            Te faltan{" "}
            <span className="font-semibold text-primary-600">
              {formatMXNFromCents(progress.remainingCents)}
            </span>{" "}
            para obtener envío gratis.
          </p>
          <div className="h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress.progressPercent}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </div>
  );
}

