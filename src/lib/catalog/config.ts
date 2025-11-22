/**
 * Configuración del catálogo
 * Constantes compartidas para paginación y límites
 */

export const CATALOG_PAGE_SIZE = 24; // Productos por página

/**
 * Calcula el offset para paginación basado en el número de página (1-based)
 * @param page Número de página (1-based)
 * @param pageSize Tamaño de página
 * @returns Offset para usar en .range() de Supabase
 */
export function calculateOffset(page: number, pageSize: number = CATALOG_PAGE_SIZE): number {
  return (page - 1) * pageSize;
}

/**
 * Parsea y valida el número de página desde searchParams
 * @param pageParam Valor del query param 'page' (string o undefined)
 * @returns Número de página válido (mínimo 1)
 */
export function parsePage(pageParam: string | undefined): number {
  if (!pageParam) return 1;
  const parsed = parseInt(pageParam, 10);
  if (isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

/**
 * Determina si hay una página siguiente basado en la cantidad de items retornados
 * @param itemsCount Cantidad de items en la página actual
 * @param pageSize Tamaño de página
 * @returns true si hay más páginas disponibles
 */
export function hasNextPage(itemsCount: number, pageSize: number = CATALOG_PAGE_SIZE): boolean {
  return itemsCount === pageSize;
}

/**
 * Opciones de ordenamiento disponibles para el catálogo
 */
export type CatalogSortOption = "relevance" | "price_asc" | "price_desc" | "name_asc";

/**
 * Normaliza el parámetro de ordenamiento desde la URL
 * @param sortParam Valor del query param 'sort' (string, null o undefined)
 * @returns Opción de ordenamiento válida, usando 'relevance' como fallback
 */
export function normalizeSortParam(
  sortParam: string | null | undefined,
): CatalogSortOption {
  if (!sortParam) return "relevance";
  
  const validOptions: CatalogSortOption[] = [
    "relevance",
    "price_asc",
    "price_desc",
    "name_asc",
  ];
  
  if (validOptions.includes(sortParam as CatalogSortOption)) {
    return sortParam as CatalogSortOption;
  }
  
  return "relevance";
}

/**
 * Opciones de rango de precio disponibles para filtros
 */
export type PriceRangeKey = "all" | "lt_500" | "500_1000" | "gt_1000";

/**
 * Normaliza el parámetro de rango de precio desde la URL
 * @param priceRangeParam Valor del query param 'priceRange' (string, null o undefined)
 * @returns Opción de rango válida, usando 'all' como fallback
 */
export function normalizePriceRangeParam(
  priceRangeParam: string | null | undefined,
): PriceRangeKey {
  if (!priceRangeParam) return "all";
  
  const validOptions: PriceRangeKey[] = ["all", "lt_500", "500_1000", "gt_1000"];
  
  if (validOptions.includes(priceRangeParam as PriceRangeKey)) {
    return priceRangeParam as PriceRangeKey;
  }
  
  return "all";
}

/**
 * Mapea un PriceRangeKey a un objeto con minCents y/o maxCents para filtros
 * @param priceRange Clave del rango de precio
 * @returns Objeto con minCents y/o maxCents, o null si es "all"
 */
export function getPriceRangeBounds(priceRange: PriceRangeKey): {
  minCents?: number;
  maxCents?: number;
} | null {
  switch (priceRange) {
    case "lt_500":
      return { maxCents: 49999 }; // < $500 (499.99)
    case "500_1000":
      return { minCents: 50000, maxCents: 100000 }; // $500 - $1,000
    case "gt_1000":
      return { minCents: 100001 }; // > $1,000
    case "all":
    default:
      return null;
  }
}

/**
 * Obtiene el label legible para un rango de precio
 * @param priceRange Clave del rango de precio
 * @returns Label legible para mostrar en UI
 */
export function getPriceRangeLabel(priceRange: PriceRangeKey): string {
  switch (priceRange) {
    case "lt_500":
      return "Menos de $500";
    case "500_1000":
      return "$500 a $1,000";
    case "gt_1000":
      return "Más de $1,000";
    case "all":
    default:
      return "Todos los precios";
  }
}

