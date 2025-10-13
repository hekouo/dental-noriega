// src/app/api/debug/catalog/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { loadAllSections } from "@/lib/data/catalog-sections";
import { imageSrc } from "@/lib/utils/catalog";

export async function GET() {
  try {
    const secs = await loadAllSections();
    const summary = secs.map(s => ({
      sectionSlug: s.sectionSlug,
      sectionName: s.sectionName,
      file: s.file,
      count: s.items.length,
      sample: s.items.slice(0, 2).map(i => ({
        title: i.title,
        price: i.price,
        image: i.image,
        resolvedImage: imageSrc(i.image)
      }))
    }));
    return NextResponse.json({ sections: summary });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
