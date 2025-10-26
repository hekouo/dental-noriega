import { NextResponse } from "next/server";
import { getAll } from "@/lib/data/catalog-index.server";

export async function GET() {
  const items = getAll().map(p => ({
    section: p.section,
    slug: p.slug,
    hasImage: !!p.imageUrl,
    host: (() => { try { return p.imageUrl ? new URL(p.imageUrl).hostname : null; } catch { return "bad-url"; } })(),
  }));
  const hosts = new Set(items.filter(i => i.host).map(i => i.host));
  return NextResponse.json({ total: items.length, hosts: [...hosts], samples: items.slice(0, 10) });
}