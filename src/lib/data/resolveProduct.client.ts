"use client";

export async function resolveProductClient(section: string, slug: string) {
  const res = await fetch(`/api/catalog/resolve?section=${encodeURIComponent(section)}&slug=${encodeURIComponent(slug)}`, { 
    cache: "force-cache" 
  });
  if (!res.ok) return null;
  return res.json(); // { product, section, slug }
}
