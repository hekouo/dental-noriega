// src/app/api/debug/images-report/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { loadAllSections } from "@/lib/data/catalog-sections";

export async function GET() {
  try {
    const sections = await loadAllSections();
    const broken: Array<{ section: string; title: string; img: string }> = [];

    sections.forEach((s) =>
      s.items.forEach((i) => {
        if (!i.imageResolved || i.imageResolved.endsWith("/placeholder.png")) {
          broken.push({ section: s.sectionName, title: i.title, img: i.image });
        }
      }),
    );

    return NextResponse.json({
      success: true,
      totalSections: sections.length,
      totalProducts: sections.reduce((sum, s) => sum + s.items.length, 0),
      brokenCount: broken.length,
      broken,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
