import { NextResponse } from "next/server";
import { listBySection } from "@/lib/supabase/catalog";
import { tryParseUrl } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await listBySection("equipos");
    const hosts = new Map<string, number>();
    for (const it of items ?? []) {
      const u = tryParseUrl(it?.image_url ?? "");
      if (!u) continue;
      hosts.set(u.hostname, (hosts.get(u.hostname) ?? 0) + 1);
    }
    return NextResponse.json({
      total: items?.length ?? 0,
      hosts: Array.from(hosts.entries()).map(([host, count]) => ({
        host,
        count,
      })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
