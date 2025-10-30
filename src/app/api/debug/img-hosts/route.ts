import { NextResponse } from "next/server";
import { listBySection } from "@/lib/supabase/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listBySection("equipos");
  const map = new Map<string, number>();

  for (const it of items) {
    const url = it.image_url?.toString() ?? "";
    const hostname = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return "";
      }
    })();

    if (!hostname) continue;
    map.set(hostname, (map.get(hostname) ?? 0) + 1);
  }

  return NextResponse.json(Object.fromEntries(map));
}
