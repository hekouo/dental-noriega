// src/app/api/debug/files/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import { join } from "path";
import { isDebugEnabled } from "@/lib/utils/debug";

export async function GET() {
  if (!isDebugEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const dataDir = join(process.cwd(), "public", "data");
    const files = await readdir(dataDir);
    const csvFiles = files.filter((f) => f.endsWith(".csv"));

    return NextResponse.json({
      success: true,
      count: csvFiles.length,
      files: csvFiles.map((f) => `/data/${f}`),
      message: "Archivos CSV encontrados en public/data/",
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
