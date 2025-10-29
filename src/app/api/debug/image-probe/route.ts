import { NextResponse } from "next/server";
import { tryParseUrl, isAllowedImageHost } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const u = tryParseUrl(url);
  if (!u || !isAllowedImageHost(u))
    return NextResponse.json(
      { ok: false, error: "forbidden host" },
      { status: 400 },
    );
  try {
    const r = await fetch(u.toString(), { method: "GET" });
    return NextResponse.json({
      ok: r.ok,
      status: r.status,
      contentType: r.headers.get("content-type"),
      finalUrl: r.url,
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
