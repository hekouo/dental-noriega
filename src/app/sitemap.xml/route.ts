// src/app/sitemap.xml/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<Response> {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://dental-noriega.vercel.app";
  const urls = [
    "",
    "destacados",
    "tienda",
    "catalogo",
    "buscar",
    "checkout",
    "carrito",
  ].map((p) => `${site}/${p}`.replace(/\/+$/, "/"));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${u}</loc></url>`).join("")}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
