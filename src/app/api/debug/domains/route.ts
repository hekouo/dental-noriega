export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from "next/server";
import { getAll } from "@/lib/data/catalog-index.server";
import { isDebugEnabled } from "@/lib/utils/debug";

export async function GET() {
  if (!isDebugEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
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
