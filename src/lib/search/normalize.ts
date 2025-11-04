// src/lib/search/normalize.ts
/**
 * Utilidades de normalización y scoring para búsqueda
 */

/**
 * Normaliza un string: lower, sin acentos, colapsar espacios
 */
export function normalize(input: string): string {
  if (!input) return "";

  const map: Record<string, string> = {
    Á: "A",
    É: "E",
    Í: "I",
    Ó: "O",
    Ú: "U",
    Ü: "U",
    Ñ: "N",
    á: "a",
    é: "e",
    í: "i",
    ó: "o",
    ú: "u",
    ü: "u",
    ñ: "n",
  };

  return input
    .replace(/[ÁÉÍÓÚÜÑáéíóúüñ]/g, (ch) => map[ch] ?? ch)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokeniza una query: split por espacios, quitar vacíos
 */
export function tokenize(q: string): string[] {
  return normalize(q)
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Escapa un string para usar en RegExp de forma segura
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export type SearchableItem = {
  title: string;
  product_slug: string;
  section: string;
};

/**
 * Calcula un score de coincidencia entre un item y tokens de búsqueda
 * Más alto = mejor match
 * Considera:
 * - coincidencias en title (más peso), product_slug, section
 * - prefijo (token inicia título/slug) > substring
 */
export function scoreMatch(
  item: SearchableItem,
  tokens: string[],
): number {
  const tTitle = normalize(item.title);
  const tSlug = normalize(item.product_slug);
  const tSec = normalize(item.section);

  let score = 0;

  for (const tk of tokens) {
    const hitTitlePrefix = tTitle.startsWith(tk);
    const hitSlugPrefix = tSlug.startsWith(tk);
    const hitTitle = tTitle.includes(tk);
    const hitSlug = tSlug.includes(tk);
    const hitSec = tSec.includes(tk);

    if (hitTitlePrefix) score += 6;
    else if (hitTitle) score += 4;

    if (hitSlugPrefix) score += 3;
    else if (hitSlug) score += 2;

    if (hitSec) score += 1;
  }

  return score;
}

