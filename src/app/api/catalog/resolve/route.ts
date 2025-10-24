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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") ?? "";
  const slug = searchParams.get("slug") ?? "";
  const debug = searchParams.get("debug") === "1";

  // Normalizar inputs
  const normalizedSection = normalizeSlug(section) as SectionSlug;
  const normalizedSlug = normalizeSlug(slug);

  // Verificar que la sección es válida
  if (!SECTIONS.includes(normalizedSection)) {
    return NextResponse.json({ 
      ok: false, 
      error: "Invalid section",
      suggestions: []
    }, { status: 400 });
  }

  try {
    // Fase 1: Búsqueda exacta
    let result = await findExact(normalizedSection, normalizedSlug);
    if (result) {
      return NextResponse.json({ 
        ok: true, 
        section: normalizedSection, 
        slug: normalizedSlug,
        canonical: true,
        product: result
      });
    }

    // Fase 2: Búsqueda por alias
    result = await findAlias(normalizedSection, normalizedSlug);
    if (result) {
      return NextResponse.json({ 
        ok: true, 
        section: normalizedSection, 
        slug: normalizedSlug,
        canonical: false,
        redirectTo: `/catalogo/${normalizedSection}/${normalizedSlug}`,
        product: result
      });
    }

    // Fase 3: Búsqueda cross-section
    const crossResults = await findCross(normalizedSlug);
    if (crossResults.length > 0) {
      const best = crossResults[0];
      return NextResponse.json({ 
        ok: true, 
        section: best.section, 
        slug: best.slug,
        canonical: false,
        redirectTo: `/catalogo/${best.section}/${best.slug}`,
        product: best.product
      });
    }

    // Fase 4: Aplicar correcciones de typos
    const correctedSlug = applyTypoCorrections(normalizedSlug);
    if (correctedSlug !== normalizedSlug) {
      result = await findExact(normalizedSection, correctedSlug);
      if (result) {
        return NextResponse.json({ 
          ok: true, 
          section: normalizedSection, 
          slug: correctedSlug,
          canonical: false,
          redirectTo: `/catalogo/${normalizedSection}/${correctedSlug}`,
          product: result
        });
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

    return NextResponse.json({ 
      ok: false, 
      suggestions,
      guessedSection,
      debug: debug ? {
        original: { section, slug },
        normalized: { section: normalizedSection, slug: normalizedSlug },
        corrected: correctedSlug,
        fuzzyCount: fuzzyResults.length
      } : undefined
    }, { status: 404 });

  } catch (error) {
    console.error("[API] Catalog resolve error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
