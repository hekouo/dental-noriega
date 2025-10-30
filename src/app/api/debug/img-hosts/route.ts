import { NextResponse } from "next/server";
import { createAnonClient } from "@/lib/supabase/anon-client";
import { tryParseUrl } from "@/lib/utils/url";
import { allowDebug } from "../_guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!allowDebug) return new Response("debug off", { status: 404 });
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? "200"), 2000);

  const supa = createAnonClient();
  const { data, error } = await supa
    .from("api_catalog_with_images")
    .select("image_url")
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{ image_url?: string | null }>) {
    const u = tryParseUrl(row?.image_url ?? undefined);
    const host = u?.hostname ?? "invalid";
    counts[host] = (counts[host] ?? 0) + 1;
  }

  return NextResponse.json({ ok: true, limit, hosts: counts });
}
