import { NextResponse } from "next/server";
import { resolveProduct } from "@/lib/data/resolveProduct";
import { 
  getCatalogIndex, 
  findExact, 
  findAlias, 
  findCross, 
  findFuzzy,
  applyTypoCorrections,
  type SectionSlug 
} from "@/lib/data/catalog-index.server";
import { SECTIONS, SECTION_KEYWORDS } from "@/lib/data/sections";
import { normalizeSlug } from "@/lib/utils/slug";

type ResolveOk = {
  ok: true;
  section: string;
  slug: string;
  canonical: boolean;
  redirectTo?: string;
  product?: { 
    name: string; 
    sku?: string; 
    inStock?: boolean; 
    price?: number 
  };
  suggestions: Array<{ section: string; slug: string; score?: number }>;
};

type ResolveFail = {
  ok: false;
  guessedSection?: string;
  suggestions: Array<{ section: string; slug: string; score?: number }>;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") ?? "";
  const slug = searchParams.get("slug") ?? "";
  const debug = searchParams.get("debug") === "1";

  // Normalizar inputs
  const normalizedSection = normalizeSlug(section) as SectionSlug;
  const normalizedSlug = normalizeSlug(slug);

  // Si la sección no es válida (ej. "destacados"), ignorar y usar cross-section
  const validSection = SECTIONS.includes(normalizedSection) ? normalizedSection : null;

  try {
    // Fase 1: Búsqueda exacta (solo si la sección es válida)
    let result = validSection ? await findExact(validSection, normalizedSlug) : null;
    if (result) {
      const response: ResolveOk = { 
        ok: true, 
        section: normalizedSection, 
        slug: normalizedSlug,
        canonical: true,
        product: {
          name: result.title,
          sku: result.id,
          inStock: true, // Por defecto disponible
          price: result.price
        },
        suggestions: []
      };
      return NextResponse.json(response);
    }

    // Fase 2: Búsqueda por alias (solo si la sección es válida)
    result = validSection ? await findAlias(validSection, normalizedSlug) : null;
    if (result) {
      const response: ResolveOk = { 
        ok: true, 
        section: normalizedSection, 
        slug: normalizedSlug,
        canonical: false,
        redirectTo: `/catalogo/${normalizedSection}/${normalizedSlug}`,
        product: {
          name: result.title,
          sku: result.id,
          inStock: true, // Por defecto disponible
          price: result.price
        },
        suggestions: []
      };
      return NextResponse.json(response);
    }

    // Fase 3: Búsqueda cross-section
    const crossResults = await findCross(normalizedSlug);
    if (crossResults.length > 0) {
      const best = crossResults[0];
      const response: ResolveOk = { 
        ok: true, 
        section: best.section, 
        slug: best.slug,
        canonical: false,
        redirectTo: `/catalogo/${best.section}/${best.slug}`,
        product: {
          name: best.product.title,
          sku: best.product.id,
          inStock: true, // Por defecto disponible
          price: best.product.price
        },
        suggestions: []
      };
      return NextResponse.json(response);
    }

    // Fase 4: Aplicar correcciones de typos
    const correctedSlug = applyTypoCorrections(normalizedSlug);
    if (correctedSlug !== normalizedSlug) {
      result = validSection ? await findExact(validSection, correctedSlug) : null;
      if (result) {
        const response: ResolveOk = { 
          ok: true, 
          section: normalizedSection, 
          slug: correctedSlug,
          canonical: false,
          redirectTo: `/catalogo/${normalizedSection}/${correctedSlug}`,
          product: {
            name: result.title,
            sku: result.id,
            inStock: true, // Por defecto disponible
            price: result.price
          },
          suggestions: []
        };
        return NextResponse.json(response);
      }
    }

    // Fase 5: Búsqueda fuzzy
    const fuzzyResults = await findFuzzy(normalizedSlug, 2);
    const suggestions = fuzzyResults.slice(0, 8).map(r => ({
      section: r.section,
      slug: r.slug,
      score: r.score,
      title: r.product.title
    }));

    // Heurística de sección sugerida
    let guessedSection = normalizedSection;
    for (const keyword of Object.keys(SECTION_KEYWORDS)) {
      if (normalizedSlug.includes(keyword)) {
        const possibleSections = SECTION_KEYWORDS[keyword];
        if (possibleSections.length > 0) {
          guessedSection = possibleSections[0];
          break;
        }
      }
    }

    const response: ResolveFail = { 
      ok: false, 
      suggestions,
      guessedSection,
      ...(debug && {
        debug: {
          original: { section, slug },
          normalized: { section: normalizedSection, slug: normalizedSlug },
          corrected: correctedSlug,
          fuzzyCount: fuzzyResults.length
        }
      })
    };
    return NextResponse.json(response); // Siempre 200, nunca 404

  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG === "1") {
      console.error("[API] Catalog resolve error:", error);
    }
    const response: ResolveFail = { 
      ok: false, 
      suggestions: []
    };
    return NextResponse.json(response); // Siempre 200, nunca 500
  }
}
