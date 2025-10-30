export function normalizeSlug(input: string): string {
  // sonarjs: regex justificado; entradas cortas y acotadas por UI/validaciones
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// alias para compatibilidad
export const autocorrect = normalizeSlug;
