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

