export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getAll } from "@/lib/data/catalog-index.server";
import { allowDebug } from "../_guard";

export async function GET() {
  if (!allowDebug) return new Response("debug off", { status: 404 });
  const set = new Set<string>();
  for (const p of await getAll()) {
    if (p.image_url) {
      try {
        set.add(new URL(p.image_url).hostname);
      } catch {}
    }
  }
  return NextResponse.json({
    success: true,
    domains: [...set],
    totalDomains: set.size,
  });
}
