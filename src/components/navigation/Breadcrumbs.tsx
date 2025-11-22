// src/components/navigation/Breadcrumbs.tsx
import Link from "next/link";

export type Crumb = {
  href?: string;
  label: string;
};

export type BreadcrumbsProps = {
  items: Crumb[];
  className?: string;
};

/**
 * Componente de breadcrumbs (migas de pan) reutilizable
 * Renderiza una lista de navegación horizontal con separadores
 */
export default function Breadcrumbs({
  items,
  className = "",
}: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const hasLink = item.href && !isLast;

          return (
            <li key={index} className="flex items-center">
              {hasLink && item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium text-gray-900" : ""}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="mx-1 text-gray-300" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

