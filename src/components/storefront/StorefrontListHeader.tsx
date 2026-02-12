import React from "react";

export type StorefrontListHeaderProps = {
  /** Título principal (h1 o h2 según nivel) */
  title: string;
  /** Subtítulo opcional */
  subtitle?: string;
  /** Contador opcional (ej. "12 productos") */
  counter?: string | number;
  /** Acciones opcionales (filtros, orden, etc.) */
  actions?: React.ReactNode;
  /** Nivel de encabezado: 1 = h1, 2 = h2 */
  level?: 1 | 2;
  /** Clase adicional para el contenedor */
  className?: string;
};

/**
 * Encabezado reutilizable para listados de tienda/búsqueda.
 * Estilo Heritage: marfil/bronce/neutros, consistente con pills y focus-premium.
 */
export default function StorefrontListHeader({
  title,
  subtitle,
  counter,
  actions,
  level = 2,
  className = "",
}: StorefrontListHeaderProps) {
  const HeadingTag = level === 1 ? "h1" : "h2";
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 ${className}`}
      data-storefront-header
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <HeadingTag
            className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 dark:text-white scroll-mt-20"
            id="storefront-list-title"
          >
            {title}
          </HeadingTag>
          {counter != null && String(counter).length > 0 && (
            <span
              className="pill pill-neutral shrink-0"
              aria-label={`Total: ${counter}`}
            >
              {counter}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-sm text-stone-600 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0 min-w-0" data-storefront-header-actions>
          {actions}
        </div>
      )}
    </div>
  );
}
