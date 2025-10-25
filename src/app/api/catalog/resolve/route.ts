// src/app/api/catalog/resolve/route.ts
import { NextResponse } from "next/server";
import { findBySectionSlug, findFuzzy } from "@/lib/data/catalog-index.server";

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
  const rawSection = searchParams.get("section") || undefined;
  const slug = (searchParams.get("slug") || "").trim();
  const q = (searchParams.get("q") || "").trim();

  const section = rawSection === "destacados" ? undefined : rawSection;

  // Si tenemos section y slug válidos, buscar exacto
  if (section && slug) {
    const product = findBySectionSlug(section, slug);
    if (product) {
      const redirectTo = `/catalogo/${product.section}/${product.slug}`;
      const ok: ResolveOk = {
        ok: true,
        product: {
          section: product.section,
          slug: product.slug,
          title: product.title,
          price: product.price,
          imageUrl: product.imageUrl,
          inStock: product.inStock ?? true,
        },
        redirectTo,
        suggestions: [],
      };
      if (DEBUG) console.log("[resolve] exact:", redirectTo);
      return NextResponse.json(ok, { status: 200 });
    }
  }

  // Si solo tenemos query, buscar fuzzy
  const query = q || slug;
  if (query) {
    const result = findFuzzy(query);
    if (result.product) {
      const redirectTo = `/catalogo/${result.product.section}/${result.product.slug}`;
      const ok: ResolveOk = {
        ok: true,
        product: {
          section: result.product.section,
          slug: result.product.slug,
          title: result.product.title,
          price: result.product.price,
          imageUrl: result.product.imageUrl,
          inStock: result.product.inStock ?? true,
        },
        redirectTo,
        suggestions: result.suggestions.map((s: any) => ({
          section: s.section,
          slug: s.slug,
          title: s.title,
          price: s.price,
          imageUrl: s.imageUrl,
          inStock: s.inStock ?? true,
        })),
      };
      if (DEBUG) console.log("[resolve] fuzzy match:", redirectTo);
      return NextResponse.json(ok, { status: 200 });
    }

    if (result.suggestions.length > 0) {
      const ok: ResolveOk = {
        ok: true,
        suggestions: result.suggestions.map((s: any) => ({
          section: s.section,
          slug: s.slug,
          title: s.title,
          price: s.price,
          imageUrl: s.imageUrl,
          inStock: s.inStock ?? true,
        })),
      };
      if (DEBUG) console.log("[resolve] suggestions:", result.suggestions.length);
      return NextResponse.json(ok, { status: 200 });
    }
  }

  const fail: ResolveFail = { ok: false, suggestions: [] };
  if (DEBUG) console.log("[resolve] fail:", query);
  return NextResponse.json(fail, { status: 200 });
}