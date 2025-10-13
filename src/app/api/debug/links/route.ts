// src/app/api/debug/links/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { loadAllSections } from "@/lib/data/catalog-sections";
import { ROUTES } from "@/lib/routes";

export async function GET() {
  try {
    const sections = await loadAllSections();
    const sample = sections.map(s => ({
      sectionName: s.sectionName,
      sectionSlug: s.sectionSlug,
      sectionHref: ROUTES.section(s.sectionSlug),
      itemCount: s.items.length,
      firstProduct: s.items[0]
        ? {
            title: s.items[0].title,
            slug: s.items[0].slug,
            href: ROUTES.product(s.sectionSlug, s.items[0].slug),
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      catalogIndex: ROUTES.catalogIndex(),
      totalSections: sections.length,
      totalProducts: sections.reduce((sum, s) => sum + s.items.length, 0),
      sample,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

