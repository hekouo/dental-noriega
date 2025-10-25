// src/app/api/_warmup/route.ts
import { NextResponse } from "next/server";
import { getProductBySectionSlug } from "@/lib/catalog/getProduct.server";

export async function GET() {
  await getProductBySectionSlug("__noop__", "__noop__").catch(() => null);
  return NextResponse.json({ ok: true });
}
