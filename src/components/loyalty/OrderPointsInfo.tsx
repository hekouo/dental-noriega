"use client";

import { useEffect, useRef } from "react";
import { estimatePointsForPriceCents, estimateFutureValueFromPoints } from "@/lib/loyalty/utils";
import { formatMXNFromCents } from "@/lib/utils/currency";
import { trackLoyaltyPointsEarned } from "@/lib/analytics/events";

type Props = {
  totalCents: number;
  messageType: "earned" | "pending";
  className?: string;
  orderId?: string;
};

/**
 * Componente para mostrar información de puntos ganados o por ganar en una orden
 */
export default function OrderPointsInfo({
  totalCents,
  messageType,
  className = "",
  orderId,
}: Props) {
  const trackedRef = useRef(false);
  const estimatedPoints = estimatePointsForPriceCents(totalCents);
  const estimatedFutureValue = estimateFutureValueFromPoints(estimatedPoints);

  // Trackear cuando se muestra la información de puntos (antes de cualquier return)
  useEffect(() => {
    if (orderId && estimatedPoints > 0 && totalCents > 0 && !trackedRef.current) {
      trackedRef.current = true;
      trackLoyaltyPointsEarned({
        orderId,
        points: estimatedPoints,
        estimatedValueMxn: estimatedFutureValue,
        status: messageType,
      });
    }
  }, [orderId, estimatedPoints, estimatedFutureValue, messageType, totalCents]);

  // No mostrar si no hay puntos estimados
  if (estimatedPoints <= 0 || totalCents <= 0) {
    return null;
  }

  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">⭐</div>
        <div className="flex-1">
          {messageType === "earned" ? (
            <>
              <p className="text-sm font-medium text-amber-900 mb-1">
                Con este pedido ganarás aproximadamente{" "}
                <span className="font-semibold">
                  {estimatedPoints.toLocaleString()} puntos
                </span>{" "}
                de lealtad.
              </p>
              {estimatedFutureValue > 0 && (
                <p className="text-xs text-amber-800">
                  Equivalen aprox. a{" "}
                  <span className="font-semibold">
                    {formatMXNFromCents(estimatedFutureValue * 100)}
                  </span>{" "}
                  de ahorro en futuras compras.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-amber-900 mb-1">
                Cuando confirmemos tu pago, ganarás aproximadamente{" "}
                <span className="font-semibold">
                  {estimatedPoints.toLocaleString()} puntos
                </span>{" "}
                de lealtad por este pedido.
              </p>
              {estimatedFutureValue > 0 && (
                <p className="text-xs text-amber-800">
                  Equivalen aprox. a{" "}
                  <span className="font-semibold">
                    {formatMXNFromCents(estimatedFutureValue * 100)}
                  </span>{" "}
                  de ahorro en futuras compras.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

