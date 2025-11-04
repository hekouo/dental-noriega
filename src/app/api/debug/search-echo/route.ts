// src/app/api/debug/search-echo/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.json({
    q: url.searchParams.get("q"),
    page: url.searchParams.get("page"),
  });
}

