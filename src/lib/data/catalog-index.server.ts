import "server-only";
import { loadProductBySlug } from "./catalog-sections";
import { SECTIONS, type SectionSlug } from "./sections";

export type { SectionSlug };
import { ALIASES, TYPO_MAP } from "./slug-aliases";

export type ProductLite = {
  id: string;
  section: string;
  slug: string;
  title: string;
  price: number;
  imageUrl?: string;
  inStock?: boolean;
};

export type CatalogIndex = {
  bySection: Map<SectionSlug, Map<string, ProductLite>>;
  globalSlugs: Map<string, Array<{ section: SectionSlug; slug: string }>>;
};

let catalogIndex: CatalogIndex | null = null;

async function buildCatalogIndex(): Promise<CatalogIndex> {
  const bySection = new Map<SectionSlug, Map<string, ProductLite>>();
  const globalSlugs = new Map<
    string,
    Array<{ section: SectionSlug; slug: string }>
  >();

  // Inicializar mapas por sección
  for (const section of SECTIONS) {
    bySection.set(section, new Map());
  }

  // Cargar productos de cada sección
  for (const section of SECTIONS) {
    await loadSectionProducts(section, bySection, globalSlugs);
  }

  return { bySection, globalSlugs };
}

async function loadSectionProducts(
  section: SectionSlug,
  bySection: Map<SectionSlug, Map<string, ProductLite>>,
  globalSlugs: Map<string, Array<{ section: SectionSlug; slug: string }>>,
) {
  try {
    const products = await loadProductBySlug(section, "");
    if (products && Array.isArray(products)) {
      for (const product of products) {
        const productLite: ProductLite = {
          id: product.sku || product.title,
          section,
          title: product.title,
          price: product.price,
          imageUrl: product.image,
          slug: product.slug,
        };

        // Agregar a mapa por sección
        bySection.get(section)!.set(product.slug, productLite);

        // Agregar a índice global
        if (!globalSlugs.has(product.slug)) {
          globalSlugs.set(product.slug, []);
        }
        globalSlugs.get(product.slug)!.push({ section, slug: product.slug });

        // Agregar aliases al índice global
        const aliases = ALIASES[product.slug] || [];
        for (const alias of aliases) {
          if (!globalSlugs.has(alias)) {
            globalSlugs.set(alias, []);
          }
          globalSlugs.get(alias)!.push({ section, slug: product.slug });
        }
      }
    }
  } catch (error) {
    console.warn(`[CatalogIndex] Failed to load section ${section}:`, error);
  }
}

export async function getCatalogIndex(): Promise<CatalogIndex> {
  if (!catalogIndex) {
    catalogIndex = await buildCatalogIndex();
  }
  return catalogIndex;
}

// Funciones de búsqueda
export async function findExact(
  section: SectionSlug,
  slug: string,
): Promise<ProductLite | null> {
  const index = await getCatalogIndex();
  return index.bySection.get(section)?.get(slug) || null;
}

export async function findAlias(
  section: SectionSlug,
  slug: string,
): Promise<ProductLite | null> {
  const index = await getCatalogIndex();
  const sectionMap = index.bySection.get(section);
  if (!sectionMap) return null;

  // Buscar por alias directo
  for (const [canonicalSlug, product] of sectionMap) {
    const aliases = ALIASES[canonicalSlug] || [];
    if (aliases.includes(slug)) {
      return product;
    }
  }

  return null;
}

export async function findCross(
  slug: string,
): Promise<
  Array<{ section: SectionSlug; slug: string; product: ProductLite }>
> {
  const index = await getCatalogIndex();
  const results: Array<{
    section: SectionSlug;
    slug: string;
    product: ProductLite;
  }> = [];

  const entries = index.globalSlugs.get(slug) || [];
  for (const { section, slug: canonicalSlug } of entries) {
    const product = index.bySection.get(section)?.get(canonicalSlug);
    if (product) {
      results.push({ section, slug: canonicalSlug, product });
    }
  }

  return results;
}


// Función de distancia de Levenshtein
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= b.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }

  return matrix[b.length][a.length];
}

// Función para aplicar correcciones de typos
export function applyTypoCorrections(slug: string): string {
  let corrected = slug;

  for (const [typo, correction] of Object.entries(TYPO_MAP)) {
    corrected = corrected.replace(new RegExp(typo, "g"), correction);
  }

  return corrected;
}

// Función para normalizar slugs
function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/\s+/g, "-") // espacios por guiones
    .replace(/[^a-z0-9-]/g, "") // solo letras, números y guiones
    .replace(/-+/g, "-") // múltiples guiones por uno
    .replace(/^-|-$/g, ""); // quitar guiones al inicio/final
}

// Buscar producto por section y slug
export function findBySectionSlug(section: string, slug: string): ProductLite | null {
  if (!catalogIndex) return null;
  
  const normalizedSlug = normalizeSlug(slug);
  const bySection = catalogIndex.bySection.get(section as SectionSlug);
  if (!bySection) return null;
  
  // Buscar exacto
  let product = bySection.get(normalizedSlug);
  if (product) {
    return { ...product, section, inStock: product.inStock ?? true };
  }
  
  // Buscar por alias
  const aliases = ALIASES[normalizedSlug] || [];
  for (const alias of aliases) {
    product = bySection.get(alias);
    if (product) {
      return { ...product, section, inStock: product.inStock ?? true };
    }
  }
  
  return null;
}

// Búsqueda fuzzy con sugerencias
export function findFuzzy(query: string): { product?: ProductLite; suggestions: ProductLite[] } {
  if (!catalogIndex) return { suggestions: [] };
  
  const normalizedQuery = normalizeSlug(query);
  const suggestions: ProductLite[] = [];
  let exactMatch: ProductLite | undefined;
  
  // 1) Búsqueda exacta por slug
  for (const [section, sectionMap] of catalogIndex.bySection) {
    for (const [, product] of sectionMap) {
      if (product.slug === normalizedQuery) {
        exactMatch = { ...product, section, inStock: product.inStock ?? true };
        break;
      }
    }
    if (exactMatch) break;
  }
  
  if (exactMatch) {
    return { product: exactMatch, suggestions: [] };
  }
  
  // 2) Búsqueda "contains" en title
  for (const [section, sectionMap] of catalogIndex.bySection) {
    for (const [, product] of sectionMap) {
      const normalizedTitle = normalizeSlug(product.title);
      if (normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle)) {
        suggestions.push({ ...product, section, inStock: product.inStock ?? true });
      }
    }
  }
  
  // 3) Distancia Levenshtein corta
  if (suggestions.length < 5) {
    for (const [section, sectionMap] of catalogIndex.bySection) {
      for (const [, product] of sectionMap) {
        const distance = levenshteinDistance(normalizedQuery, product.slug);
        if (distance <= 2 && !suggestions.some(s => s.id === product.id)) {
          suggestions.push({ ...product, section, inStock: product.inStock ?? true });
        }
      }
    }
  }
  
  return { suggestions: suggestions.slice(0, 6) };
}
