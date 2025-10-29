// src/app/api/debug/files/route.ts
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import { join } from "path";

export async function GET() {
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
