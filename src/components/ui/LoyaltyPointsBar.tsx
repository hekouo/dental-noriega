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
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Si value <= 0, no animar
    if (!value || value <= 0) {
      setProgress(0);
      return;
    }

    // Calcular porcentaje
    const safeMax = Math.max(max, value || 0, 1);
    const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));

    // Truco para que la transición se vea: resetear a 0 y luego animar al porcentaje final
    setProgress(0);
    const id = requestAnimationFrame(() => {
      setProgress(percentage);
    });

    return () => cancelAnimationFrame(id);
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
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

