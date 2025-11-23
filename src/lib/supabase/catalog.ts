import { createAnonClient } from "./anon-client";
import { normalizeSection } from "@/lib/utils/sections";
import { normalizeSlug } from "@/lib/utils/slug";

export type CatalogItem = {
  id: string;
  section: string;
  product_slug: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  in_stock: boolean | null; // null = desconocido/preview
  is_active?: boolean | null;
};

// Nota: lógica de inventario previa eliminada por no usarse en este módulo

export async function getFeaturedProducts(): Promise<CatalogItem[]> {
  const sb = createAnonClient();
  if (!sb) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] missing supabase envs");
    }
    return [];
  }
  try {
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
          active
        )
      `,
      )
      .order("position", { ascending: true })
      .limit(8);

    if (error) {
      console.error("[getFeaturedProducts] Error:", error);
      return [];
    }

    return (data as Array<{ api_catalog_with_images: unknown }>).map((row) => {
      const rec = row.api_catalog_with_images as unknown as
        | CatalogItem
        | CatalogItem[];
      const item = Array.isArray(rec) ? rec[0] : rec;
      return {
        id: item.id,
        title: item.title,
        section: item.section,
        product_slug: item.product_slug,
        price_cents: item.price_cents,
        image_url: item.image_url,
        in_stock: item.in_stock,
        // La vista puede tener 'active' o 'is_active'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vista dinámica de Supabase
        is_active: (item as any).active ?? (item as any).is_active ?? true,
      } satisfies CatalogItem;
    });
  } catch (error) {
    console.error("[getFeaturedProducts] Error:", error);
    return [];
  }
}

export async function getBySectionSlug(
  section: string,
  slug: string,
): Promise<CatalogItem | null> {
  const sb = createAnonClient();
  if (!sb) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] missing supabase envs");
    }
    return null;
  }
  try {
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select(
        "id, section, product_slug, title, price_cents, image_url, in_stock, active",
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
      is_active: (data as any).active ?? true,
    };
  } catch (error) {
    console.error("[getBySectionSlug] Error:", error);
    return null;
  }
}

export async function getProductBySlugAnySection(
  slug: string,
): Promise<CatalogItem | null> {
  const sb = createAnonClient();
  if (!sb) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] missing supabase envs");
    }
    return null;
  }
  try {
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select(
        "id, section, product_slug, title, price_cents, image_url, in_stock, active",
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

export async function listBySection(
  sectionRaw: string,
): Promise<CatalogItem[]> {
  const sb = createAnonClient();
  if (!sb) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] missing supabase envs");
    }
    return [];
  }
  try {
    const section = normalizeSection(sectionRaw);
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select(
        "id, section, product_slug, sku, title, price_cents, image_url, in_stock, active",
      )
      .eq("active", true)
      .eq("section", section)
      .order("title", { ascending: true });

    if (error) {
      console.error("[listBySection] Error:", error);
      return [];
    }

    type CatalogRow = CatalogItem & { sku?: string | null } & {
      product_slug?: string | null;
    };

    return (data as CatalogRow[]).map((item) => {
      const ensuredSlug = item.product_slug ?? item.sku ?? normalizeSlug(item.title);
      return {
        id: item.id,
        section: item.section,
        product_slug: ensuredSlug,
        title: item.title,
        price_cents: item.price_cents,
        image_url: item.image_url,
        in_stock: item.in_stock,
        // La vista puede tener 'active' o 'is_active'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Vista dinámica de Supabase
        is_active: (item as any).active ?? (item as any).is_active ?? true,
      } satisfies CatalogItem;
    });
  } catch (error) {
    console.error("[listBySection] Error:", error);
    return [];
  }
}

export async function searchProducts(
  query: string,
  limit = 24,
): Promise<CatalogItem[]> {
  const sb = createAnonClient();
  if (!sb) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] missing supabase envs");
    }
    return [];
  }
  try {
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select(
        "id, section, product_slug, title, price_cents, image_url, in_stock, active",
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
  const sb = createAnonClient();
  if (!sb) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] missing supabase envs");
    }
    return [];
  }
  try {
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select(
        "id, section, product_slug, title, price_cents, image_url, in_stock, active",
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
  const sb = createAnonClient();
  if (!sb) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] missing supabase envs");
    }
    return [];
  }
  try {
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select("section")
      .eq("active", true);

    if (error) {
      console.error("[listSectionsFromCatalog] Error:", error);
      return [];
    }

    // Obtener secciones únicas y ordenadas
    const sections = Array.isArray(data)
      ? ([
          ...new Set(
            (data as Array<{ section: string }>).map((item) => item.section),
          ),
        ].sort() as string[])
      : [];
    return sections;
  } catch (error) {
    console.error("[listSectionsFromCatalog] Error:", error);
    return [];
  }
}
