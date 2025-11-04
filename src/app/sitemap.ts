// src/app/sitemap.ts
import { MetadataRoute } from "next";
import { getAllFromCatalog } from "@/lib/catalog/getAllFromCatalog.server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const now = new Date();

  const urls: MetadataRoute.Sitemap = [
    {
      url: baseUrl || "/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/destacados`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/catalogo`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  try {
    const items = await getAllFromCatalog();
    for (const item of items) {
      urls.push({
        url: `${baseUrl}/catalogo/${item.section}/${item.product_slug}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch {
    // noop - seguir con URLs básicas
  }

  return urls;
}

