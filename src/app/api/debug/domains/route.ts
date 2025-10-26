import { NextResponse } from "next/server";
import { getAll } from "@/lib/data/catalog-index.server";

export async function GET() {
  const set = new Set<string>();
  for (const p of getAll()) {
    if (p.imageUrl) {
      try { set.add(new URL(p.imageUrl).hostname); } catch {}
    }
  }
  return NextResponse.json({ success: true, domains: [...set], totalDomains: set.size });
}