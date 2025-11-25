"use client";

import { useState, useEffect } from "react";

type LoyaltyPointsBarProps = {
  value: number; // puntos a representar
  max?: number; // opcional, target visual, default razonable
  className?: string;
};

/**
 * Barra de progreso animada para mostrar puntos de lealtad
 */
export function LoyaltyPointsBar({
  value,
  max = 5000,
  className,
}: LoyaltyPointsBarProps) {
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    // Si value <= 0, no animar
    if (value <= 0) {
      setDisplayPercent(0);
      return;
    }

    // Calcular porcentaje
    const safeMax = Math.max(max, value || 0, 1);
    const percentage = Math.min(100, (value / safeMax) * 100);

    // Animar desde 0 hasta el porcentaje final
    setDisplayPercent(percentage);
  }, [value, max]);

  // Si value <= 0, no renderizar
  if (value <= 0) return null;

  return (
    <div
      className={`h-2 w-full rounded-full bg-gray-100 overflow-hidden ${className || ""}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${displayPercent}%` }}
      />
    </div>
  );
}

