// src/lib/search/normalize.ts
/**
 * Utilidades de normalización y scoring para búsqueda
 */

/**
 * Normaliza un string: lower, sin acentos, colapsar espacios
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/\s+/g, " ") // colapsar espacios
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
  if (tokens.length === 0) return 0;

  const normTitle = normalize(item.title);
  const normSlug = normalize(item.product_slug);
  const normSection = normalize(item.section);

  let score = 0;

  for (const token of tokens) {
    const normToken = normalize(token);

    // Title matches (más peso)
    if (normTitle.startsWith(normToken)) {
      score += 10; // prefijo en título
    } else if (normTitle.includes(normToken)) {
      score += 5; // substring en título
    }

    // Slug matches
    if (normSlug.startsWith(normToken)) {
      score += 8; // prefijo en slug
    } else if (normSlug.includes(normToken)) {
      score += 4; // substring en slug
    }

    // Section matches (menos peso)
    if (normSection.includes(normToken)) {
      score += 2;
    }
  }

  return score;
}

