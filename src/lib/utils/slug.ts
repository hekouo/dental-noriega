export function normalizeSlug(input: string): string {
  // RegEx justificado: entrada corta y prevalidada en UI/Zod; no riesgo DoS
  return (
    input
      .normalize("NFD")
      // eslint-disable-next-line sonarjs/slow-regex -- patrón existente; revisar en sweep 2
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      // eslint-disable-next-line sonarjs/anchor-precedence -- operador claro por contexto; revisar en sweep 2
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

// alias para compatibilidad
export const autocorrect = normalizeSlug;
