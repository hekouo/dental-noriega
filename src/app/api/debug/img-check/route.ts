import { NextResponse } from "next/server";
import { listBySection } from "@/lib/supabase/catalog";
import { normalizeImageUrl } from "@/lib/utils/images";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = (await listBySection("equipos")).slice(0, 20);
  const out = [];

  for (const it of items) {
    const raw = it.image_url ?? "";
    const norm = normalizeImageUrl(raw);

    let s1 = 0;
    try {
      const r = await fetch(norm ?? "", { method: "HEAD" });
      s1 = r.status;
    } catch {}

    out.push({ title: it.title, raw, norm, status: s1 });
  }

  return NextResponse.json(out);
}
