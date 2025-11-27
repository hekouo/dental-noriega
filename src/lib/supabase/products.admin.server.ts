import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Crea un cliente Supabase con SERVICE_ROLE_KEY (bypassa RLS)
 * Reutiliza el mismo patrón que orders.server.ts
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
 * Tipo para un producto en el panel admin
 */
export type AdminProduct = {
  id: string;
  section_slug: string | null;
  slug: string;
  title: string;
  price: number; // precio en MXN (no cents)
  price_cents: number; // precio en centavos
  description: string | null;
  sku: string | null;
  active: boolean;
  in_stock: boolean;
  image_url: string | null; // URL de la imagen primaria
  created_at: string;
};

/**
 * Tipo para crear/actualizar producto
 */
export type AdminProductInput = {
  section_slug: string;
  slug: string;
  title: string;
  price: number; // precio en MXN (se convierte a price_cents)
  description?: string | null;
  sku?: string | null;
  active?: boolean;
  image_url?: string | null; // Si se proporciona, se crea/actualiza product_images
};

/**
 * Tipo para sección
 */
export type AdminSection = {
  slug: string;
  name: string;
};

/**
 * Obtiene todas las secciones disponibles
 */
export async function getAdminSections(): Promise<AdminSection[]> {
  const supabase = createServiceRoleSupabase();

  try {
    // Intentar leer desde tabla sections
    const { data: sectionsData, error: sectionsError } = await supabase
      .from("sections")
      .select("slug, name")
      .order("name", { ascending: true });

    if (!sectionsError && sectionsData && sectionsData.length > 0) {
      return sectionsData.map((s) => ({
        slug: s.slug || "",
        name: s.name || s.slug || "",
      }));
    }

    // Fallback: obtener secciones únicas desde productos
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("section_slug")
      .not("section_slug", "is", null)
      .neq("section_slug", "");

    if (productsError || !productsData) {
      return [];
    }

    const uniqueSections = [
      ...new Set(
        productsData
          .map((p) => p.section_slug)
          .filter((s): s is string => Boolean(s)),
      ),
    ].sort();

    return uniqueSections.map((slug) => ({
      slug,
      name: slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
    }));
  } catch (err) {
    console.error("[getAdminSections] Error:", err);
    return [];
  }
}

/**
 * Obtiene productos para el panel admin con paginación
 */
export async function getAdminProducts(options?: {
  limit?: number;
  offset?: number;
}): Promise<{ products: AdminProduct[]; total: number }> {
  const supabase = createServiceRoleSupabase();
  const limit = options?.limit ?? 50; // Aumentar límite por defecto para ver más productos
  const offset = options?.offset ?? 0;

  try {
    // Ordenar por título para consistencia, pero permitir nulls en created_at
    const { data, error, count } = await supabase
      .from("products")
      .select(
        "id, section_slug, slug, title, price, description, sku, active, in_stock, created_at",
        { count: "exact" },
      )
      .order("title", { ascending: true }) // Ordenar por título para mejor UX
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[getAdminProducts] Error:", error);
      return { products: [], total: 0 };
    }

    // Obtener imágenes primarias para cada producto
    const productIds = (data || []).map((p) => p.id);
    const { data: imagesData } = await supabase
      .from("product_images")
      .select("product_id, url")
      .in("product_id", productIds)
      .eq("is_primary", true);

    const imageMap = new Map<string, string>();
    (imagesData || []).forEach((img) => {
      if (img.url && !imageMap.has(img.product_id)) {
        imageMap.set(img.product_id, img.url);
      }
    });

    const products: AdminProduct[] = (data || []).map((p) => ({
      id: p.id,
      section_slug: p.section_slug || null,
      slug: p.slug,
      title: p.title,
      price: Number(p.price) || 0,
      price_cents: Math.round((Number(p.price) || 0) * 100),
      description: p.description || null,
      sku: p.sku || null,
      active: p.active ?? true,
      in_stock: p.in_stock ?? true,
      image_url: imageMap.get(p.id) || null,
      created_at: p.created_at,
    }));

    return {
      products,
      total: count ?? 0,
    };
  } catch (err) {
    console.error("[getAdminProducts] Error:", err);
    return { products: [], total: 0 };
  }
}

/**
 * Obtiene un producto por ID con su imagen primaria
 */
export async function getAdminProductById(
  productId: string,
): Promise<AdminProduct | null> {
  const supabase = createServiceRoleSupabase();

  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, section_slug, slug, title, price, description, sku, active, in_stock, created_at")
      .eq("id", productId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Obtener imagen primaria
    const { data: imageData } = await supabase
      .from("product_images")
      .select("url")
      .eq("product_id", productId)
      .eq("is_primary", true)
      .maybeSingle();

    return {
      id: data.id,
      section_slug: data.section_slug || null,
      slug: data.slug,
      title: data.title,
      price: Number(data.price) || 0,
      price_cents: Math.round((Number(data.price) || 0) * 100),
      description: data.description || null,
      sku: data.sku || null,
      active: data.active ?? true,
      in_stock: data.in_stock ?? true,
      image_url: imageData?.url || null,
      created_at: data.created_at,
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
    // Insertar producto
    const { data: productData, error: productError } = await supabase
      .from("products")
      .insert({
        section_slug: input.section_slug,
        slug: input.slug,
        title: input.title,
        price: input.price,
        description: input.description || null,
        sku: input.sku || null,
        active: input.active ?? true,
        in_stock: true,
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

    // Si hay image_url, crear registro en product_images
    if (input.image_url) {
      // Primero, desmarcar cualquier imagen primaria existente (por si acaso)
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
    // Actualizar producto
    const { error: productError } = await supabase
      .from("products")
      .update({
        section_slug: input.section_slug,
        slug: input.slug,
        title: input.title,
        price: input.price,
        description: input.description || null,
        sku: input.sku || null,
        active: input.active ?? true,
      })
      .eq("id", productId);

    if (productError) {
      return {
        success: false,
        error: productError.message || "Error al actualizar producto",
      };
    }

    // Manejar imagen primaria
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

