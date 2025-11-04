// src/app/api/debug/search-health/route.ts
import { NextResponse } from "next/server";
import { getAllFromCatalog } from "@/lib/catalog/getAllFromCatalog.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getAllFromCatalog();
  return NextResponse.json({
    total: items.length,
    sample: items.slice(0, 5),
  });
}

