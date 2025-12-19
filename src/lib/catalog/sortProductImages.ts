export type ProductImage = {
  url: string;
  is_primary?: boolean | null;
  created_at?: string;
};

/**
 * Ordena imágenes de producto:
 * 1. Primero las marcadas como is_primary = true
 * 2. Luego por created_at ascendente
 */
export function sortProductImages(
  images: ProductImage[],
): ProductImage[] {
  return [...images].sort((a, b) => {
    // Primero: is_primary = true va primero
    const aIsPrimary = a.is_primary === true;
    const bIsPrimary = b.is_primary === true;

    if (aIsPrimary && !bIsPrimary) return -1;
    if (!aIsPrimary && bIsPrimary) return 1;

    // Segundo: ordenar por created_at ascendente
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;

    return aDate - bDate;
  });
}

