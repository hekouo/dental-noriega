import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Crea un cliente Supabase con SERVICE_ROLE_KEY (bypassa RLS)
 */
function createServiceRoleSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables de Supabase (URL o SERVICE_ROLE_KEY)");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Tipo para un producto en el listado del panel admin
 */
export type AdminProductListItem = {
  id: string;
  title: string;
  slug: string;
  sectionId: string | null;
  sectionSlug: string | null;
  sectionName: string | null;
  priceCents: number;
  currency: string | null;
  stockQty: number | null;
  active: boolean;
  image_url: string | null;
  createdAt: string;
  updatedAt: string | null;
};

/**
 * Tipo para un producto completo (usado en formularios de edición)
 */
export type AdminProduct = {
  id: string;
  sectionId: string | null;
  sectionSlug: string | null;
  sectionName: string | null;
  slug: string;
  title: string;
  priceCents: number;
  currency: string;
  stockQty: number | null;
  active: boolean;
  description: string | null;
  sku: string | null;
  image_url: string | null;
  createdAt: string;
  updatedAt: string | null;
};

/**
 * Tipo para crear/actualizar producto
 */
export type AdminProductInput = {
  sectionId: string; // UUID de la sección
  slug: string;
  title: string;
  priceMxn: number; // Precio en MXN (se convierte a price_cents)
  stockQty?: number | null;
  description?: string | null;
  sku?: string | null;
  active?: boolean;
  image_url?: string | null;
};

/**
 * Tipo para sección
 */
export type AdminSection = {
  id: string; // UUID
  slug: string;
  name: string;
};

/**
 * Obtiene todas las secciones disponibles desde public.sections
 */
export async function getAdminSections(): Promise<AdminSection[]> {
  const supabase = createServiceRoleSupabase();

  try {
    const { data, error } = await supabase
      .from("sections")
      .select("id, slug, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("[getAdminSections] Error:", error);
      return [];
    }

    return (data || []).map((s) => ({
      id: s.id,
      slug: s.slug || "",
      name: s.name || s.slug || "",
    }));
  } catch (err) {
    console.error("[getAdminSections] Error:", err);
    return [];
  }
}

/**
 * Obtiene productos para el panel admin con paginación
 * Usa el esquema real: section_id (FK), price_cents, stock_qty, etc.
 */
export async function getAdminProducts(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ products: AdminProductListItem[]; total: number }> {
  const supabase = createServiceRoleSupabase();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  try {
    // Query con join a sections usando la sintaxis de Supabase
    const { data, error, count } = await supabase
      .from("products")
      .select(
        `
        id,
        title,
        slug,
        section_id,
        price_cents,
        currency,
        stock_qty,
        active,
        image_url,
        created_at,
        updated_at,
        sections!inner (
          id,
          slug,
          name
        )
      `,
        { count: "exact" },
      )
      .order("title", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[getAdminProducts] Error en query:", error);
      // Si falla el join, intentar sin join
      const { data: dataFallback, error: errorFallback, count: countFallback } =
        await supabase
          .from("products")
          .select("id, title, slug, section_id, price_cents, currency, stock_qty, active, image_url, created_at, updated_at", {
            count: "exact",
          })
          .order("title", { ascending: true })
          .range(offset, offset + limit - 1);

      if (errorFallback || !dataFallback) {
        return { products: [], total: 0 };
      }

      // Mapear sin sección
      const products: AdminProductListItem[] = dataFallback.map((p) => ({
        id: p.id,
        title: p.title || "",
        slug: p.slug || "",
        sectionId: p.section_id || null,
        sectionSlug: null,
        sectionName: null,
        priceCents: p.price_cents ?? 0,
        currency: p.currency || "mxn",
        stockQty: p.stock_qty ?? null,
        active: p.active ?? true,
        image_url: p.image_url || null,
        createdAt: p.created_at || "",
        updatedAt: p.updated_at || null,
      }));

      return {
        products,
        total: countFallback ?? 0,
      };
    }

    if (!data) {
      console.warn("[getAdminProducts] No se recibieron datos de Supabase");
      return { products: [], total: 0 };
    }

    // Mapear los datos al tipo AdminProductListItem
    const products: AdminProductListItem[] = data.map((p) => {
      // El join puede devolver un objeto o un array
      const section = (p as { sections?: { id: string; slug: string; name: string } | { id: string; slug: string; name: string }[] }).sections;
      const sectionObj = Array.isArray(section) ? section[0] : section;

      return {
        id: p.id,
        title: p.title || "",
        slug: p.slug || "",
        sectionId: p.section_id || null,
        sectionSlug: sectionObj?.slug || null,
        sectionName: sectionObj?.name || null,
        priceCents: p.price_cents ?? 0,
        currency: p.currency || "mxn",
        stockQty: p.stock_qty ?? null,
        active: p.active ?? true,
        image_url: p.image_url || null,
        createdAt: p.created_at || "",
        updatedAt: p.updated_at || null,
      };
    });

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[getAdminProducts] Encontrados ${products.length} productos (total: ${count ?? 0})`,
      );
    }

    return {
      products,
      total: count ?? 0,
    };
  } catch (err) {
    console.error("[getAdminProducts] Error inesperado:", err);
    return { products: [], total: 0 };
  }
}

/**
 * Obtiene un producto por ID con su sección
 */
export async function getAdminProductById(
  productId: string,
): Promise<AdminProduct | null> {
  const supabase = createServiceRoleSupabase();

  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        id,
        section_id,
        slug,
        title,
        price_cents,
        currency,
        stock_qty,
        active,
        description,
        sku,
        image_url,
        created_at,
        updated_at,
        sections!inner (
          id,
          slug,
          name
        )
      `,
      )
      .eq("id", productId)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error("[getAdminProductById] Error:", error);
        // Intentar sin join si falla
        const { data: dataFallback, error: errorFallback } = await supabase
          .from("products")
          .select("id, section_id, slug, title, price_cents, currency, stock_qty, active, description, sku, image_url, created_at, updated_at")
          .eq("id", productId)
          .maybeSingle();

        if (errorFallback || !dataFallback) {
          return null;
        }

        return {
          id: dataFallback.id,
          sectionId: dataFallback.section_id || null,
          sectionSlug: null,
          sectionName: null,
          slug: dataFallback.slug || "",
          title: dataFallback.title || "",
          priceCents: dataFallback.price_cents ?? 0,
          currency: dataFallback.currency || "mxn",
          stockQty: dataFallback.stock_qty ?? null,
          active: dataFallback.active ?? true,
          description: dataFallback.description || null,
          sku: dataFallback.sku || null,
          image_url: dataFallback.image_url || null,
          createdAt: dataFallback.created_at || "",
          updatedAt: dataFallback.updated_at || null,
        };
      }
      return null;
    }

    const section = (data as { sections?: { id: string; slug: string; name: string } | { id: string; slug: string; name: string }[] }).sections;
    const sectionObj = Array.isArray(section) ? section[0] : section;

    return {
      id: data.id,
      sectionId: data.section_id || null,
      sectionSlug: sectionObj?.slug || null,
      sectionName: sectionObj?.name || null,
      slug: data.slug || "",
      title: data.title || "",
      priceCents: data.price_cents ?? 0,
      currency: data.currency || "mxn",
      stockQty: data.stock_qty ?? null,
      active: data.active ?? true,
      description: data.description || null,
      sku: data.sku || null,
      image_url: data.image_url || null,
      createdAt: data.created_at || "",
      updatedAt: data.updated_at || null,
    };
  } catch (err) {
    console.error("[getAdminProductById] Error:", err);
    return null;
  }
}

/**
 * Crea un nuevo producto
 */
export async function createAdminProduct(
  input: AdminProductInput,
): Promise<{ success: boolean; productId?: string; error?: string }> {
  const supabase = createServiceRoleSupabase();

  try {
    const priceCents = Math.round(input.priceMxn * 100);

    // Insertar producto
    const { data: productData, error: productError } = await supabase
      .from("products")
      .insert({
        section_id: input.sectionId,
        slug: input.slug,
        title: input.title,
        price_cents: priceCents,
        currency: "mxn",
        stock_qty: input.stockQty ?? null,
        description: input.description || null,
        sku: input.sku || null,
        active: input.active ?? true,
        image_url: input.image_url || null,
      })
      .select("id")
      .single();

    if (productError || !productData) {
      return {
        success: false,
        error: productError?.message || "Error al crear producto",
      };
    }

    const productId = productData.id;

    // Si hay image_url, también crear/actualizar en product_images como primaria
    if (input.image_url) {
      // Desmarcar cualquier imagen primaria existente
      await supabase
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", productId);

      // Crear nueva imagen primaria
      const { error: imageError } = await supabase
        .from("product_images")
        .insert({
          product_id: productId,
          url: input.image_url,
          is_primary: true,
        });

      if (imageError) {
        console.error("[createAdminProduct] Error al crear imagen:", imageError);
        // No fallar si la imagen falla, el producto ya está creado
      }
    }

    return {
      success: true,
      productId,
    };
  } catch (err) {
    console.error("[createAdminProduct] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}

/**
 * Actualiza un producto existente
 */
export async function updateAdminProduct(
  productId: string,
  input: AdminProductInput,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceRoleSupabase();

  try {
    const priceCents = Math.round(input.priceMxn * 100);

    // Actualizar producto
    const { error: productError } = await supabase
      .from("products")
      .update({
        section_id: input.sectionId,
        slug: input.slug,
        title: input.title,
        price_cents: priceCents,
        stock_qty: input.stockQty ?? null,
        description: input.description || null,
        sku: input.sku || null,
        active: input.active ?? true,
        image_url: input.image_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (productError) {
      return {
        success: false,
        error: productError.message || "Error al actualizar producto",
      };
    }

    // Manejar imagen primaria en product_images
    if (input.image_url !== undefined) {
      // Desmarcar todas las imágenes primarias existentes
      await supabase
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", productId);

      if (input.image_url) {
        // Verificar si ya existe una imagen con esta URL
        const { data: existingImage } = await supabase
          .from("product_images")
          .select("id")
          .eq("product_id", productId)
          .eq("url", input.image_url)
          .maybeSingle();

        if (existingImage) {
          // Actualizar existente a primaria
          await supabase
            .from("product_images")
            .update({ is_primary: true })
            .eq("id", existingImage.id);
        } else {
          // Crear nueva imagen primaria
          await supabase
            .from("product_images")
            .insert({
              product_id: productId,
              url: input.image_url,
              is_primary: true,
            });
        }
      }
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error("[updateAdminProduct] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}
