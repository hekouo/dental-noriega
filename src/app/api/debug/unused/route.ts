// src/app/api/debug/unused/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { loadAllSections } from "@/lib/data/catalog-sections";
import { imageSrc } from "@/lib/utils/catalog";
import { isDebugEnabled } from "@/lib/utils/debug";

export async function GET() {
  if (!isDebugEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const publicDir = path.join(process.cwd(), "public");
    const dataDir = path.join(publicDir, "data");

    const files = await fs.readdir(dataDir);
    const csvs = files.filter((f) => /\.csv$/i.test(f));

    const sections = await loadAllSections();
    const usedCsvs = new Set(
      sections.map((s) => s.file.replace(/^\/data\//, "")),
    );

    const unusedCsvs = csvs.filter((f) => !usedCsvs.has(f)).sort();

    // Chequear solo imágenes locales
    const missingImages: Array<{
      section: string;
      title: string;
      expectedPath: string;
    }> = [];
    for (const s of sections) {
      for (const i of s.items) {
        const resolved = imageSrc(i.image);
        if (
          !/^https?:\/\//i.test(resolved) &&
          resolved !== "/img/products/placeholder.png"
        ) {
          const abs = path.join(publicDir, resolved.replace(/^\//, ""));
          try {
            await fs.access(abs);
          } catch {
            missingImages.push({
              section: s.sectionName,
              title: i.title,
              expectedPath: abs,
            });
          }
        }
      }
    }

    return NextResponse.json({
      unusedCsvs,
      missingImages,
      totalProducts: sections.reduce((sum, s) => sum + s.items.length, 0),
      totalSections: sections.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
