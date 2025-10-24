import { NextResponse } from "next/server";
import { resolveProduct } from "@/lib/data/resolveProduct";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") ?? "";
  const slug = searchParams.get("slug") ?? "";
  const data = await resolveProduct(section, slug); // server-only, puede usar fs
  if (!data) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json(data);
}
