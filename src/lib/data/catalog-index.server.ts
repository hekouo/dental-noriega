import "server-only";
import { normalizeSlug } from "@/lib/utils/slug";
import {
  getFeaturedProducts as getFeaturedProductsFromSupabase,
  listCatalog,
  getBySectionSlug as getProductBySectionSlugDb,
  getProductBySlugAnySection as getProductBySlugAnySectionDb,
  searchProducts,
  listSectionsFromCatalog,
  listBySection,
  type CatalogItem,
} from "@/lib/supabase/catalog";

export type ProductLite = {
  id: string;
  section: string;
  slug: string;
  title: string;
  variant?: string;
  pack?: string;
  price: number;
  image_url?: string;
  currency?: string;
  in_stock: boolean | null;
};

export async function getAll(): Promise<ProductLite[]> {
  const items = await listCatalog();
  return items.map((item) => ({
    id: item.id,
    section: item.section,
    slug: item.product_slug,
    title: item.title,
    price: Math.round(item.price_cents / 100),
    image_url: item.image_url ?? undefined,
    in_stock: item.in_stock,
  }));
}

export async function findBySectionSlug(
  section: string,
  slug: string,
): Promise<ProductLite | null> {
  const s = normalizeSlug(section);
  const g = normalizeSlug(slug);
  const item = await getProductBySectionSlugDb(s, g);

  if (!item) return null;

  return {
    id: item.id,
    section: item.section,
    slug: item.product_slug,
    title: item.title,
    price: Math.round(item.price_cents / 100),
    image_url: item.image_url ?? undefined,
    in_stock: item.in_stock,
  };
}

export async function findByTitleTokens(
  q: string,
  _minTokens = 2,
): Promise<ProductLite[]> {
  const query = q.trim();
  if (!query) return [];

  const items = await searchProducts(query, 24);
  return items.map((item) => ({
    id: item.id,
    section: item.section,
    slug: item.product_slug,
    title: item.title,
    price: Math.round(item.price_cents / 100),
    image_url: item.image_url ?? undefined,
    in_stock: item.in_stock,
  }));
}

export async function findBySlugAnySection(
  slug: string,
): Promise<ProductLite | null> {
  const normalizedSlug = normalizeSlug(slug);
  const item = await getProductBySlugAnySectionDb(normalizedSlug);

  if (!item) return null;

  return {
    id: item.id,
    section: item.section,
    slug: item.product_slug,
    title: item.title,
    price: Math.round(item.price_cents / 100),
    image_url: item.image_url ?? undefined,
    in_stock: item.in_stock,
  };
}

export async function getFeaturedProducts(): Promise<CatalogItem[]> {
  return await getFeaturedProductsFromSupabase();
}

export async function getSections(): Promise<string[]> {
  return await listSectionsFromCatalog();
}

export async function getProductsBySection(
  section: string,
): Promise<CatalogItem[]> {
  return await listBySection(section);
}
