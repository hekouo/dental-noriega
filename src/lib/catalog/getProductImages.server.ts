import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";

export type ProductImage = {
  url: string;
  is_primary: boolean | null;
  created_at: string;
};

/**
 * Obtiene las imágenes de un producto desde product_images.
 * Ordena por is_primary desc, luego por created_at asc.
 */
export async function getProductImages(
  productId: string,
): Promise<ProductImage[]> {
  noStore();
  const sb = createClient();

  const { data, error } = await sb
    .from("product_images")
    .select("url, is_primary, created_at")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error || !data) {
    if (process.env.NODE_ENV !== "production" && error) {
      console.warn("[getProductImages] Error:", error);
    }
    return [];
  }

  return data.map((img) => ({
    url: img.url,
    is_primary: img.is_primary,
    created_at: img.created_at,
  }));
}

