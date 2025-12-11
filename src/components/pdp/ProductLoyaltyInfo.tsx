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
 * Muestra cuántos puntos se ganan y su valor aproximado en MXN
 */
export default function ProductLoyaltyInfo({
  priceCents,
}: ProductLoyaltyInfoProps) {
  const estimatedPoints = estimatePointsForPriceCents(priceCents);
  const futureValue = estimateFutureValueFromPoints(estimatedPoints);

  // No mostrar nada si no hay puntos estimados
  if (estimatedPoints <= 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mt-3">
      <div className="space-y-2">
        {/* Línea 1: Puntos ganados */}
        <p className="text-sm font-medium text-amber-900">
          Acumulas aprox.{" "}
          <span className="font-semibold">
            {estimatedPoints.toLocaleString("es-MX")}
          </span>{" "}
          puntos con este producto.
        </p>

        {/* Línea 2: Valor aproximado */}
        {futureValue > 0 && (
          <p className="text-xs text-amber-700">
            Equivalen aprox. a{" "}
            <span className="font-medium">{formatMXN(futureValue)}</span>{" "}
            MXN en futuros descuentos.
          </p>
        )}

        {/* Link a cuenta/pedidos */}
        <Link
          href="/cuenta/pedidos"
          className="inline-block text-sm text-primary-600 underline-offset-2 hover:underline transition-colors"
        >
          Ver tus puntos y niveles
        </Link>
      </div>
    </div>
  );
}

