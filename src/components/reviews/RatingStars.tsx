import React from "react";

type Props = {
  rating: number;
  max?: number;
  className?: string;
};

export function RatingStars({ rating, max = 5, className = "" }: Props) {
  const value = Math.min(max, Math.max(0, Math.round(rating)));
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`Valoración: ${value} de ${max}`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={
            i < value
              ? "text-amber-500 dark:text-amber-400"
              : "text-gray-200 dark:text-gray-600"
          }
          aria-hidden
        >
          ★
        </span>
      ))}
    </span>
  );
}
