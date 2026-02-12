import React from "react";

export type EmptyStateProps = {
  /** Título principal */
  title: string;
  /** Descripción breve */
  description?: string;
  /** Ícono opcional (React node, ej. lucide icon) */
  icon?: React.ReactNode;
  /** Contenido adicional: chips, CTAs, etc. */
  children?: React.ReactNode;
  /** Clase adicional para el contenedor */
  className?: string;
  /** role/aria para accesibilidad */
  role?: "status" | "region" | "alert";
  "aria-live"?: "polite" | "assertive" | "off";
};

/**
 * Estado vacío reutilizable para listados (tienda, buscar).
 * Estilo Heritage: marfil/bronce, bordes suaves, focus-premium y tap-feedback en CTAs.
 */
export default function EmptyState({
  title,
  description,
  icon,
  children,
  className = "",
  role = "status",
  "aria-live": ariaLive = "polite",
}: EmptyStateProps) {
  return (
    <div
      className={`bg-card rounded-xl border border-stone-200/90 dark:border-gray-700 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm ${className}`}
      role={role}
      aria-live={ariaLive}
      data-storefront-empty
    >
      {icon != null && (
        <div
          className="w-20 h-20 mx-auto rounded-full bg-amber-50/90 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-800/50 flex items-center justify-center mb-6 text-amber-800 dark:text-amber-200"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-stone-600 dark:text-gray-400 mb-6">
          {description}
        </p>
      )}
      {children != null && <div className="space-y-6">{children}</div>}
    </div>
  );
}
