"use client";

import { useState, useEffect } from "react";

type AnimatedPointsProps = {
  value: number;
  durationMs?: number; // default ~600
  className?: string;
};

/**
 * Componente que anima un contador de puntos desde 0 hasta el valor final
 */
export function AnimatedPoints({
  value,
  durationMs = 600,
  className,
}: AnimatedPointsProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value <= 0) {
      setDisplayValue(0);
      return;
    }

    let start: number | null = null;
    const startValue = 0;
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
  }, [value, durationMs]);

  return (
    <span className={className}>
      {displayValue.toLocaleString("es-MX")}
    </span>
  );
}

