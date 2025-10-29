import { NextResponse } from "next/server";
import { listBySection } from "@/lib/supabase/catalog";
import { tryParseUrl } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await listBySection("equipos");
    const hosts: Record<string, number> = {};
    for (const p of products) {
      const u = tryParseUrl(p.image_url ?? undefined);
      if (!u) continue;
      hosts[u.hostname] = (hosts[u.hostname] ?? 0) + 1;
    }
    return NextResponse.json({ ok: true, hosts });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
