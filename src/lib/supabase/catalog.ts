import { createAnonClient } from "./anon-client";

export type CatalogItem = {
  id: string;
  section: string;
  product_slug: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  in_stock: boolean | null; // null = desconocido/preview
  stock_qty: number | null;
};

const preview = process.env.NEXT_PUBLIC_INVENTORY_MODE === "preview";

function coerceStock(v: boolean | null | undefined): boolean | undefined {
  if (v === false) return false;
  if (preview) return true;
  return v ?? undefined;
}

export async function getFeaturedProducts(): Promise<CatalogItem[]> {
  try {
    const sb = createAnonClient();
    const { data, error } = await sb
      .from("featured")
      .select(
        `
        position,
        api_catalog_with_images!inner (
          id,
          title,
          section,
          product_slug,
          price_cents,
          image_url,
          in_stock,
          stock_qty
        )
      `,
      )
      .order("position", { ascending: true })
      .limit(8);

    if (error) {
      console.error("[getFeaturedProducts] Error:", error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.api_catalog_with_images.id,
      title: item.api_catalog_with_images.title,
      section: item.api_catalog_with_images.section,
      product_slug: item.api_catalog_with_images.product_slug,
      price_cents: item.api_catalog_with_images.price_cents,
      image_url: item.api_catalog_with_images.image_url, // Ya viene normalizada de la vista
      in_stock: item.api_catalog_with_images.in_stock,
      stock_qty: item.api_catalog_with_images.stock_qty,
    }));
  } catch (error) {
    console.error("[getFeaturedProducts] Error:", error);
    return [];
  }
}

export async function getBySectionSlug(
  section: string,
  slug: string,
): Promise<CatalogItem | null> {
  try {
    const sb = createAnonClient();
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select(
        "id, section, product_slug, title, price_cents, image_url, in_stock, stock_qty",
      )
      .eq("section", section)
      .eq("product_slug", slug)
      .single();

    if (error) {
      console.error("[getBySectionSlug] Error:", error);
      return null;
    }

    return {
      id: data.id,
      section: data.section,
      product_slug: data.product_slug,
      title: data.title,
      price_cents: data.price_cents,
      image_url: data.image_url, // Ya viene normalizada de la vista
      in_stock: data.in_stock,
      stock_qty: data.stock_qty,
    };
  } catch (error) {
    console.error("[getBySectionSlug] Error:", error);
    return null;
  }
}

export async function getProductBySlugAnySection(
  slug: string,
): Promise<CatalogItem | null> {
  try {
    const sb = createAnonClient();
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select(
        "id, section, product_slug, title, price_cents, image_url, in_stock, stock_qty",
      )
      .eq("product_slug", slug)
      .single();

    if (error) {
      console.error("[getProductBySlugAnySection] Error:", error);
      return null;
    }
    return data as CatalogItem;
  } catch (error) {
    console.error("[getProductBySlugAnySection] Error:", error);
    return null;
  }
}

export async function listBySection(section: string): Promise<CatalogItem[]> {
  try {
    const sb = createAnonClient();
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select(
        "id, section, product_slug, title, price_cents, image_url, in_stock, stock_qty",
      )
      .eq("active", true)
      .eq("section", section)
      .order("title", { ascending: true });

    if (error) {
      console.error("[listBySection] Error:", error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      section: item.section,
      product_slug: item.product_slug,
      title: item.title,
      price_cents: item.price_cents,
      image_url: item.image_url, // Ya viene normalizada de la vista
      in_stock: item.in_stock,
      stock_qty: item.stock_qty,
    }));
  } catch (error) {
    console.error("[listBySection] Error:", error);
    return [];
  }
}

export async function searchProducts(
  query: string,
  limit = 24,
): Promise<CatalogItem[]> {
  try {
    const sb = createAnonClient();
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select(
        "id, section, product_slug, title, price_cents, image_url, in_stock, stock_qty",
      )
      .ilike("normalized_title", `%${query.toLowerCase()}%`)
      .limit(limit);

    if (error) {
      console.error("[searchProducts] Error:", error);
      return [];
    }
    return data as CatalogItem[];
  } catch (error) {
    console.error("[searchProducts] Error:", error);
    return [];
  }
}

export async function listCatalog(): Promise<CatalogItem[]> {
  try {
    const sb = createAnonClient();
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select(
        "id, section, product_slug, title, price_cents, image_url, in_stock, stock_qty",
      )
      .order("title", { ascending: true });

    if (error) {
      console.error("[listCatalog] Error:", error);
      return [];
    }
    return data as CatalogItem[];
  } catch (error) {
    console.error("[listCatalog] Error:", error);
    return [];
  }
}

export async function listSectionsFromCatalog(): Promise<string[]> {
  try {
    const sb = createAnonClient();
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select("section")
      .eq("active", true);

    if (error) {
      console.error("[listSectionsFromCatalog] Error:", error);
      return [];
    }

    // Obtener secciones únicas y ordenadas
    const sections = [
      ...new Set((data as any[]).map((item) => item.section)),
    ].sort() as string[];
    return sections;
  } catch (error) {
    console.error("[listSectionsFromCatalog] Error:", error);
    return [];
  }
}
