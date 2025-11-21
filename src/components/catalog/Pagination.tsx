import Link from "next/link";
import React from "react";

type PaginationProps = {
  page: number;
  hasNextPage: boolean;
  basePath: string;
  extraQuery?: Record<string, string>;
};

/**
 * Componente reutilizable de paginación
 * Muestra botones "Anterior" y "Siguiente" con navegación basada en URL
 */
export default function Pagination({
  page,
  hasNextPage,
  basePath,
  extraQuery = {},
}: PaginationProps) {
  // Construir query string con parámetros adicionales (ej: q para búsqueda)
  const buildQueryString = (targetPage: number): string => {
    const params = new URLSearchParams();
    params.set("page", targetPage.toString());
    
    // Agregar parámetros adicionales (ej: q para búsqueda)
    Object.entries(extraQuery).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
    
    return params.toString();
  };

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = hasNextPage ? page + 1 : null;

  // No mostrar paginación si solo hay una página
  if (page === 1 && !hasNextPage) {
    return null;
  }

  return (
    <nav
      aria-label="Paginación de productos"
      className="flex flex-wrap justify-center items-center gap-3 pt-6 border-t border-gray-200 mt-8"
    >
      {prevPage ? (
        <Link
          href={`${basePath}?${buildQueryString(prevPage)}`}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          aria-label="Ir a la página anterior"
        >
          ← Anterior
        </Link>
      ) : (
        <span
          className="px-4 py-2 border border-gray-200 text-gray-400 rounded-lg cursor-not-allowed bg-gray-50"
          aria-disabled="true"
        >
          ← Anterior
        </span>
      )}

      <span className="px-4 py-2 text-gray-600 text-sm">Página {page}</span>

      {nextPage ? (
        <Link
          href={`${basePath}?${buildQueryString(nextPage)}`}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          aria-label="Ir a la página siguiente"
        >
          Siguiente →
        </Link>
      ) : (
        <span
          className="px-4 py-2 border border-gray-200 text-gray-400 rounded-lg cursor-not-allowed bg-gray-50"
          aria-disabled="true"
        >
          Siguiente →
        </span>
      )}
    </nav>
  );
}

