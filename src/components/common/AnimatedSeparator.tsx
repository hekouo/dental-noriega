"use client";

import { cn } from "@/lib/utils";

type AnimatedSeparatorProps = {
  className?: string;
  /** "line" = línea horizontal; "svg" = mini SVG (stroke) */
  variant?: "line" | "svg";
};

/**
 * Separador sutil entre bloques. Respeta prefers-reduced-motion:
 * - reduce: separador estático (sin animación)
 * - no reduce: animación ligera (opacity/scale o stroke-dashoffset)
 */
export default function AnimatedSeparator({
  className,
  variant = "line",
}: AnimatedSeparatorProps) {
  const lineClasses = cn(
    "h-px w-full max-w-2xl mx-auto",
    "bg-gradient-to-r from-transparent via-gray-300/80 dark:via-gray-600/60 to-transparent",
    "separator-line",
    className
  );

  if (variant === "svg") {
    return (
      <div
        className={cn("flex justify-center py-6 sm:py-8", className)}
        aria-hidden
      >
        <svg
          className="separator-svg w-24 h-1 text-gray-300 dark:text-gray-600"
          viewBox="0 0 96 4"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 2h92"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            className="separator-stroke"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cn("py-6 sm:py-8 px-4", className)}
      aria-hidden
    >
      <div className={lineClasses} />
    </div>
  );
}
