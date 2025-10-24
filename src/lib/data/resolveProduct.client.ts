"use client";

export type ResolveResult = {
  ok: true;
  section: string;
  slug: string;
  canonical: boolean;
  redirectTo?: string;
  product: {
    id: string;
    title: string;
    price: number;
    image?: string;
    slug: string;
  };
} | {
  ok: false;
  suggestions: Array<{
    section: string;
    slug: string;
    score: number;
    title: string;
  }>;
  guessedSection: string;
  debug?: any;
};

export async function resolveProductClient(section: string, slug: string): Promise<ResolveResult | null> {
  try {
    const res = await fetch(`/api/catalog/resolve?section=${encodeURIComponent(section)}&slug=${encodeURIComponent(slug)}`, { 
      cache: "force-cache" 
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        return await res.json() as ResolveResult;
      }
      return null;
    }
    
    return await res.json() as ResolveResult;
  } catch (error) {
    console.error("[Client] Resolve product error:", error);
    return null;
  }
}
