import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon-client";
import {
  tryParseUrl,
  isAllowedImageHost,
  appendSizeParamForLh,
} from "@/lib/utils/url";
import { allowDebug } from "../_guard";

export const dynamic = "force-dynamic";

async function checkOnce(url: string) {
  try {
    const h = await fetch(url, { method: "HEAD" });
    if (h.ok) return { ok: true, status: h.status } as const;
  } catch {}
  try {
    const g = await fetch(url, { method: "GET" });
    return { ok: g.ok, status: g.status } as const;
  } catch (e: unknown) {
    return { ok: false, status: 0, error: String(e) } as const;
  }
}

export async function GET(req: Request) {
  if (!allowDebug) return new Response("debug off", { status: 404 });
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 500);

  const supa = createAnonClient();
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
    if (!u || !isAllowedImageHost(u.hostname)) {
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
    ok: results.filter((r) => (r.base as any)?.ok || (r.sized as any)?.ok)
      .length,
    fail: results.filter((r) => !((r.base as any)?.ok || (r.sized as any)?.ok))
      .length,
  };

  return NextResponse.json({ ok: true, limit, summary, results });
}
