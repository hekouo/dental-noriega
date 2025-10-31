import { NextResponse } from "next/server";
import { isDebugEnabled } from "@/lib/utils/debug";
import { tryParseUrl, isAllowedImageHost } from "@/lib/utils/url";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  if (!isDebugEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const urlParam = searchParams.get("url");
  const u = tryParseUrl(urlParam);
  if (!u || !isAllowedImageHost(u)) {
    return NextResponse.json(
      { ok: false, error: "forbidden host or invalid url" },
      { status: 400 },
    );
  }

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
