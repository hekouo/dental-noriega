// src/app/api/debug/catalog/route.ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { listSectionsFromCatalog, listBySection } from "@/lib/supabase/catalog";
import { isDebugEnabled } from "@/lib/utils/debug";

export async function GET() {
  if (!isDebugEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const sections = await listSectionsFromCatalog();
    const summary = await Promise.all(
      sections.map(async (section) => {
        const items = await listBySection(section);
        return {
          sectionSlug: section,
          sectionName: section,
          count: items.length,
          sample: items.slice(0, 2).map((item) => ({
            title: item.title,
            price_cents: item.price_cents,
            image_url: item.image_url,
          })),
        };
      }),
    );
    return NextResponse.json({ sections: summary });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
