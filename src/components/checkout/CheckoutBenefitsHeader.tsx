"use client";

import { getFreeShippingProgress } from "@/lib/shipping/freeShipping";
import {
  estimatePointsForPriceCents,
  estimateFutureValueFromPoints,
} from "@/lib/loyalty/utils";
import { formatMXNFromCents, formatMXN } from "@/lib/utils/currency";

type CheckoutBenefitsHeaderProps = {
  subtotalCents: number;
  shippingMethod?: string;
};

/**
 * Header que muestra beneficios del pedido: envío gratis y puntos de lealtad
 */
export default function CheckoutBenefitsHeader({
  subtotalCents,
  shippingMethod,
}: CheckoutBenefitsHeaderProps) {
  // No renderizar si no hay subtotal válido
  if (subtotalCents <= 0) {
    return null;
  }

  // Calcular progreso de envío gratis
  const { reached, remainingCents } = getFreeShippingProgress(subtotalCents);

  // Calcular puntos estimados
  const estimatedPoints = estimatePointsForPriceCents(subtotalCents);
  const futureValue = estimateFutureValueFromPoints(estimatedPoints);

  // Determinar si mostrar sección de envío (ocultar si es pickup)
  const showShipping = shippingMethod !== "pickup";

  // Determinar si mostrar sección de puntos
  const showPoints = estimatedPoints > 0;

  // Si no hay nada que mostrar, no renderizar
  if (!showShipping && !showPoints) {
    return null;
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-medium text-slate-900">Tus beneficios con este pedido</p>
      <div className="flex flex-wrap gap-2">
        {/* Pill de envío gratis */}
        {showShipping && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            {reached ? (
              <>Envío gratis activado ✅</>
            ) : (
              <>Te faltan {formatMXNFromCents(remainingCents)} para envío gratis</>
            )}
          </span>
        )}

        {/* Pill de puntos */}
        {showPoints && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            Ganarás aprox. {estimatedPoints.toLocaleString("es-MX")} pts
            {futureValue > 0 && (
              <> (~{formatMXN(futureValue)} MXN)</>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

