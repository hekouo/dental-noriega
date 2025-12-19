/**
 * Configuración de productos con opciones de color
 */

export type ColorProduct = {
  productSlug: string;
  productTitle?: string; // Opcional, para búsqueda por título también
  colors: string[];
};

// Lista de productos que tienen opciones de color
const COLOR_PRODUCTS: ColorProduct[] = [
  {
    productSlug: "modulo-de-llave",
    productTitle: "MODULO DE LLAVE",
    colors: [
      "Azul",
      "Rojo",
      "Verde",
      "Amarillo",
      "Rosa",
      "Naranja",
      "Morado",
      "Negro",
      "Blanco",
      "Gris",
    ],
  },
];

/**
 * Verifica si un producto tiene opciones de color
 */
export function hasColorOptions(productSlug: string, productTitle?: string): boolean {
  return COLOR_PRODUCTS.some(
    (p) =>
      p.productSlug.toLowerCase() === productSlug.toLowerCase() ||
      (productTitle && p.productTitle?.toUpperCase() === productTitle.toUpperCase()),
  );
}

/**
 * Obtiene las opciones de color para un producto
 */
export function getColorOptions(productSlug: string, productTitle?: string): string[] {
  const product = COLOR_PRODUCTS.find(
    (p) =>
      p.productSlug.toLowerCase() === productSlug.toLowerCase() ||
      (productTitle && p.productTitle?.toUpperCase() === productTitle.toUpperCase()),
  );
  return product?.colors || [];
}

/**
 * Opción especial para "Surtido (mix)"
 */
export const SURTIDO_OPTION = "Surtido (mix)";

/**
 * Formatea el variant_detail para color
 */
export function formatColorVariantDetail(color: string, notes?: string | null): string {
  if (color === SURTIDO_OPTION) {
    return notes ? `Color: ${color} · Preferencia: ${notes}` : `Color: ${color}`;
  }
  return `Color: ${color}`;
}

/**
 * Parsea variant_detail para extraer color y notas
 */
export function parseColorVariantDetail(variantDetail: string): {
  color: string | null;
  notes: string | null;
} {
  if (!variantDetail) return { color: null, notes: null };

  // Buscar "Color: ..."
  const colorMatch = variantDetail.match(/Color:\s*([^·]+)/);
  const color = colorMatch ? colorMatch[1].trim() : null;

  // Buscar "Preferencia: ..."
  const notesMatch = variantDetail.match(/Preferencia:\s*(.+)/);
  const notes = notesMatch ? notesMatch[1].trim() : null;

  return { color, notes };
}

