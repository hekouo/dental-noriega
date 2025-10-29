import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url)
    return NextResponse.json(
      { ok: false, error: "missing url" },
      { status: 400 },
    );
  try {
    const r = await fetch(url, { method: "GET" });
    return NextResponse.json({
      ok: r.ok,
      status: r.status,
      contentType: r.headers.get("content-type"),
      finalUrl: r.url,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
