import { loadProductBySlug } from "./catalog-sections";

export async function resolveProduct(section: string, slug: string) {
  // 1) buscar exacto por sección+slug
  try {
    const exact = await loadProductBySlug(section, slug);
    if (exact) return exact;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PDP] Exact match failed", { section, slug, error });
    }
  }

  // 2) si falla, intentar sin tildes / lower / hyphen normalization
  const normalizedSection = section
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  const normalizedSlug = slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  if (normalizedSection !== section || normalizedSlug !== slug) {
    try {
      const normalized = await loadProductBySlug(
        normalizedSection,
        normalizedSlug,
      );
      if (normalized) return normalized;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[PDP] Normalized match failed", {
          normalizedSection,
          normalizedSlug,
          error,
        });
      }
    }
  }

  // 3) si aún falla, buscar solo por slug (en todas las secciones)
  // Esto requeriría una función que busque en todas las secciones
  // Por ahora, devolvemos null

  // 4) último recurso: por id si slug==id
  if (/^[A-Z0-9-_]+$/i.test(slug)) {
    // Si el slug parece un ID, podríamos intentar buscar por ID
    // Pero esto requeriría una función específica
  }

  // devolver null si definitivamente no existe
  if (process.env.NODE_ENV === "development") {
    console.warn("[PDP] Not found", { section, slug });
  }

  return null;
}
