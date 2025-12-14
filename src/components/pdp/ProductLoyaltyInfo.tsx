"use client";

import Link from "next/link";
import {
  estimatePointsForPriceCents,
  estimateFutureValueFromPoints,
} from "@/lib/loyalty/utils";
import { formatMXN } from "@/lib/utils/currency";

interface ProductLoyaltyInfoProps {
  priceCents: number;
}

/**
 * Componente que muestra información de puntos de lealtad para un producto en PDP
 * Muestra puntos estimados, valor aproximado y link a la sección de puntos
 */
export default function ProductLoyaltyInfo({
  priceCents,
}: ProductLoyaltyInfoProps) {
  const estimatedPoints = estimatePointsForPriceCents(priceCents);
  const futureValue = estimateFutureValueFromPoints(estimatedPoints);

  // No mostrar si no hay puntos estimados
  if (estimatedPoints <= 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-amber-900">
          Ganarás aprox.{" "}
          <span className="font-semibold">{estimatedPoints.toLocaleString("es-MX")}</span>{" "}
          puntos con este producto.
        </p>
        {futureValue > 0 && (
          <p className="text-xs text-amber-700">
            Equivalen aprox. a {formatMXN(futureValue)} MXN de ahorro en futuras compras.
          </p>
        )}
        <Link
          href="/cuenta/puntos"
          className="inline-block text-xs text-primary-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded"
        >
          Ver tus puntos y beneficios
        </Link>
      </div>
    </div>
  );
}
