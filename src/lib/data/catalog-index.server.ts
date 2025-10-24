import "server-only";
import { loadProductBySlug } from "./catalog-sections";
import { SECTIONS, type SectionSlug } from "./sections";

export type { SectionSlug };
import { ALIASES, TYPO_MAP } from "./slug-aliases";

export type ProductLite = {
  id: string;
  title: string;
  price: number;
  image?: string;
  slug: string;
};

export type CatalogIndex = {
  bySection: Map<SectionSlug, Map<string, ProductLite>>;
  globalSlugs: Map<string, Array<{ section: SectionSlug; slug: string }>>;
};

let catalogIndex: CatalogIndex | null = null;

async function buildCatalogIndex(): Promise<CatalogIndex> {
  const bySection = new Map<SectionSlug, Map<string, ProductLite>>();
  const globalSlugs = new Map<string, Array<{ section: SectionSlug; slug: string }>>();

  // Inicializar mapas por sección
  for (const section of SECTIONS) {
    bySection.set(section, new Map());
  }

  // Cargar productos de cada sección
  for (const section of SECTIONS) {
    try {
      const products = await loadProductBySlug(section, "");
      if (products && Array.isArray(products)) {
        for (const product of products) {
          const productLite: ProductLite = {
            id: product.sku || product.title,
            title: product.title,
            price: product.price,
            image: product.image,
            slug: product.slug
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

  return { bySection, globalSlugs };
}

export async function getCatalogIndex(): Promise<CatalogIndex> {
  if (!catalogIndex) {
    catalogIndex = await buildCatalogIndex();
  }
  return catalogIndex;
}

// Funciones de búsqueda
export async function findExact(section: SectionSlug, slug: string): Promise<ProductLite | null> {
  const index = await getCatalogIndex();
  return index.bySection.get(section)?.get(slug) || null;
}

export async function findAlias(section: SectionSlug, slug: string): Promise<ProductLite | null> {
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

export async function findCross(slug: string): Promise<Array<{ section: SectionSlug; slug: string; product: ProductLite }>> {
  const index = await getCatalogIndex();
  const results: Array<{ section: SectionSlug; slug: string; product: ProductLite }> = [];

  const entries = index.globalSlugs.get(slug) || [];
  for (const { section, slug: canonicalSlug } of entries) {
    const product = index.bySection.get(section)?.get(canonicalSlug);
    if (product) {
      results.push({ section, slug: canonicalSlug, product });
    }
  }

  return results;
}

export async function findFuzzy(query: string, maxDistance = 2): Promise<Array<{ section: SectionSlug; slug: string; product: ProductLite; score: number }>> {
  const index = await getCatalogIndex();
  const results: Array<{ section: SectionSlug; slug: string; product: ProductLite; score: number }> = [];

  for (const [section, sectionMap] of index.bySection) {
    for (const [slug, product] of sectionMap) {
      const distance = levenshteinDistance(query, slug);
      if (distance <= maxDistance) {
        const score = 1 - (distance / Math.max(query.length, slug.length));
        results.push({ section, slug, product, score });
      }
    }
  }

  // Ordenar por score descendente
  return results.sort((a, b) => b.score - a.score);
}

// Función de distancia de Levenshtein
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
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
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[b.length][a.length];
}

// Función para aplicar correcciones de typos
export function applyTypoCorrections(slug: string): string {
  let corrected = slug;
  
  for (const [typo, correction] of Object.entries(TYPO_MAP)) {
    corrected = corrected.replace(new RegExp(typo, 'g'), correction);
  }
  
  return corrected;
}
