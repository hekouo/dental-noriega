"use client";

import { useState, useEffect } from "react";

type AnimatedPointsProps = {
  value: number;
  from?: number; // valor inicial para la animación (default: 0)
  durationMs?: number; // default ~600
  className?: string;
};

/**
 * Componente que anima un contador de puntos desde un valor inicial hasta el valor final
 */
export function AnimatedPoints({
  value,
  from = 0,
  durationMs = 600,
  className,
}: AnimatedPointsProps) {
  const [displayValue, setDisplayValue] = useState(from);

  useEffect(() => {
    if (value <= 0 && from <= 0) {
      setDisplayValue(0);
      return;
    }

    let start: number | null = null;
    const startValue = from;
    const diff = value - startValue;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / durationMs, 1);
      const current = Math.round(startValue + diff * progress);
      setDisplayValue(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    const frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, from, durationMs]);

  return (
    <span className={className}>
      {displayValue.toLocaleString("es-MX")}
    </span>
  );
}

