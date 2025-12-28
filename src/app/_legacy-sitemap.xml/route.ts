// src/app/sitemap.xml/route.ts
import { NextResponse } from "next/server";
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const base = SITE_URL;

  // Sitemap mínimo estático sin cookies ni Supabase
  const urls: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/destacados`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/tienda`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/buscar`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${base}/catalogo`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/terminos-condiciones`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/aviso-privacidad`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `<url><loc>${u.url}</loc><changefreq>${u.changeFrequency}</changefreq><priority>${u.priority}</priority></url>`,
  )
  .join("")}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
