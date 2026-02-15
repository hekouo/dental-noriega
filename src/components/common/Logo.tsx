"use client";

/**
 * Logo placeholder: monograma + wordmark.
 * variant: horizontal (DDN + texto) | mark (solo DDN)
 * size: sm | md | lg
 */
type LogoProps = {
  variant?: "horizontal" | "mark";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "text-xl",
  md: "text-2xl sm:text-3xl",
  lg: "text-3xl sm:text-4xl",
};

export default function Logo({ variant = "horizontal", size = "md", className = "" }: LogoProps) {
  const sizeClass = sizeClasses[size];

  if (variant === "mark") {
    return (
      <span
        className={`font-hero font-semibold tracking-tight text-gray-900 dark:text-white ${sizeClass} ${className}`}
        aria-label="Depósito Dental Noriega"
      >
        DDN
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-baseline gap-2 ${className}`}
      aria-label="Depósito Dental Noriega"
    >
      <span className={`font-hero font-semibold tracking-tight text-gray-900 dark:text-white ${sizeClass}`}>
        DDN
      </span>
      <span className={`text-gray-600 dark:text-gray-400 font-body text-base sm:text-lg hidden sm:inline`}>
        Depósito Dental Noriega
      </span>
    </span>
  );
}
