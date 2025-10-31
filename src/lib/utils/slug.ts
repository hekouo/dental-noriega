export function normalizeSlug(input: string): string {
  return input
    .normalize("NFD") // separa diacríticos
    .replace(/[\u0300-\u036f]/g, "") // elimina diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // cualquier bloque no-alfanumérico => guion
    // eslint-disable-next-line sonarjs/anchor-precedence, sonarjs/slow-regex -- precedencia explícita: ^ y $ se evalúan primero, luego alternancia; regex simple y lineal sin backtracking complejo
    .replace(/^-+|-+$/g, ""); // recorta guiones al inicio/fin
}

// alias para compatibilidad
export const autocorrect = normalizeSlug;
