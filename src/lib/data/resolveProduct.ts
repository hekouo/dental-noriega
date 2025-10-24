import "server-only";
import removeAccents from "remove-accents";
import { loadProductBySlug } from "./catalog-sections";
import { guessSectionForFeaturedSlug } from "@/lib/catalog/featuredSection";
import { normalizeSlug, autocorrect } from "@/lib/utils/slug";

function normSlug(s: string) {
  return removeAccents(s.toLowerCase().trim())
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

async function tryLoadProduct(section: string, slug: string, context: string) {
  try {
    const result = await loadProductBySlug(section, slug);
    if (result) return result;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[PDP] ${context} failed`, { section, slug, error });
    }
  }
  return null;
}

export async function resolveProduct(section: string, slug: string) {
  const s = normSlug(section);
  const g = normSlug(slug);

  // 1) exact match por section+slug
  const exact = await tryLoadProduct(s, g, "Exact match");
  if (exact) return exact;

  // 2) si viene de destacados, probar sección adivinada por heurística
  const guessed = guessSectionForFeaturedSlug(g, s);
  if (guessed !== s) {
    const guessedMatch = await tryLoadProduct(
      guessed,
      g,
      "Guessed section match",
    );
    if (guessedMatch) return guessedMatch;
  }

  // 3) búsqueda por slug normalizado solo
  if (s !== section || g !== slug) {
    const normalized = await tryLoadProduct(section, g, "Slug-only match");
    if (normalized) return normalized;
  }

  // 4) autocorrección de typos comunes
  const corrected = autocorrect(g);
  if (corrected !== g) {
    const correctedMatch = await tryLoadProduct(s, corrected, "Autocorrect match");
    if (correctedMatch) return correctedMatch;
  }

  // 5) fallback por id si slug parece id
  if (/^[a-z0-9_-]{8,}$/.test(g)) {
    const byId = await tryLoadProduct(section, g, "ID match");
    if (byId) return byId;
  }

  // 6) nada
  if (process.env.NODE_ENV === "development") {
    console.warn("[PDP] Not found", {
      section,
      slug,
      normalized: { s, g },
      guessed,
      corrected,
    });
  }

  return null;
}
