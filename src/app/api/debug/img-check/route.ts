import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon-client";
import {
  tryParseUrl,
  isAllowedImageHost,
} from "@/lib/utils/url";
import { isDebugEnabled } from "@/lib/utils/debug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function checkOnce(url: string) {
  try {
    const h = await fetch(url, { method: "HEAD" });
    if (h.ok) return { ok: true, status: h.status } as const;
  } catch {
    // Ignorar errores de HEAD, intentar GET
  }
  try {
    const g = await fetch(url, { method: "GET" });
    return { ok: g.ok, status: g.status } as const;
  } catch (e: unknown) {
    return { ok: false, status: 0, error: String(e) } as const;
  }
}

function appendSizeParamForLh(url: string, size: number): string {
  try {
    const u = new URL(url);
    if (u.hostname === "lh3.googleusercontent.com" || u.hostname.includes("googleusercontent.com")) {
      u.searchParams.set("sz", String(size));
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

export async function GET(req: Request) {
  if (!isDebugEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 500);

  const supa = createAnonClient();
  if (!supa) {
    return NextResponse.json({ ok: false, error: "Supabase not available" }, { status: 500 });
  }
  const { data, error } = await supa
    .from("api_catalog_with_images")
    .select("image_url")
    .not("image_url", "is", null)
    .limit(limit);

  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );

  const results: Array<Record<string, unknown>> = [];
  for (const row of (data ?? []) as Array<{ image_url?: string | null }>) {
    const raw = String(row.image_url ?? "");
    const u = tryParseUrl(raw);
    if (!u || !isAllowedImageHost(u)) {
      results.push({ raw, allowed: false });
      continue;
    }
    const baseUrl = u.toString();
    const sizedUrl = appendSizeParamForLh(baseUrl, 800);

    const base = await checkOnce(baseUrl);
    const sized = baseUrl === sizedUrl ? base : await checkOnce(sizedUrl);

    results.push({
      raw,
      base,
      sized: sizedUrl !== baseUrl ? { url: sizedUrl, ...sized } : undefined,
    });
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => {
      const baseOk = (r.base as { ok?: boolean })?.ok;
      const sizedOk = (r.sized as { ok?: boolean })?.ok;
      return baseOk || sizedOk;
    }).length,
    fail: results.filter((r) => {
      const baseOk = (r.base as { ok?: boolean })?.ok;
      const sizedOk = (r.sized as { ok?: boolean })?.ok;
      return !baseOk && !sizedOk;
    }).length,
  };

  return NextResponse.json({ ok: true, limit, summary, results });
}
