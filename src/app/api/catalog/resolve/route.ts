// src/app/api/catalog/resolve/route.ts
import { NextResponse } from "next/server";

type Suggestion = {
  section: string;
  slug: string;
  title?: string;
  price?: number;
  imageUrl?: string;
  inStock?: boolean;
};

type ResolveOk = {
  ok: true;
  product?: Suggestion;
  redirectTo?: string;
  suggestions: Suggestion[];
};

type ResolveFail = {
  ok: false;
  suggestions: Suggestion[];
};

const DEBUG = process.env.NEXT_PUBLIC_DEBUG === "1";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // const rawSection = searchParams.get("section") || undefined;
  const slug = (searchParams.get("slug") || "").trim();

  if (!slug) {
    const fail: ResolveFail = { ok: false, suggestions: [] };
    return NextResponse.json(fail, { status: 200 });
  }

  // Normalizar sección (ignorar "destacados")
  // const _section = rawSection === "destacados" ? undefined : rawSection;

  // TODO: Integrar con motor real (exact/alias/cross/typos/fuzzy)
  const suggestions: Suggestion[] = [];

  if (suggestions.length > 0) {
    suggestions.forEach((s) => (s.inStock = s.inStock !== false));
    const ok: ResolveOk = { ok: true, suggestions };
    if (DEBUG) console.log("[resolve] suggestions:", suggestions.length);
    return NextResponse.json(ok, { status: 200 });
  }

  const fail: ResolveFail = { ok: false, suggestions: [] };
  if (DEBUG) console.log("[resolve] fail:", slug);
  return NextResponse.json(fail, { status: 200 });
}


