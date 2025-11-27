"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminProduct,
  updateAdminProduct,
  type AdminProductInput,
} from "@/lib/supabase/products.admin.server";

export async function createProductAction(formData: FormData): Promise<void> {
  const section_slug = formData.get("section_slug")?.toString() || "";
  const slug = formData.get("slug")?.toString() || "";
  const title = formData.get("title")?.toString() || "";
  const priceStr = formData.get("price")?.toString() || "0";
  const description = formData.get("description")?.toString() || null;
  const sku = formData.get("sku")?.toString() || null;
  const active = formData.get("active") === "on";
  const image_url = formData.get("image_url")?.toString() || null;

  // Validación básica
  if (!section_slug || !slug || !title) {
    redirect("/admin/productos/nuevo?error=campos_requeridos");
    return;
  }

  const price = parseFloat(priceStr);
  if (isNaN(price) || price < 0) {
    redirect("/admin/productos/nuevo?error=precio_invalido");
    return;
  }

  const input: AdminProductInput = {
    section_slug,
    slug,
    title,
    price,
    description,
    sku,
    active,
    image_url,
  };

  const result = await createAdminProduct(input);

  if (!result.success) {
    redirect(`/admin/productos/nuevo?error=${encodeURIComponent(result.error || "error_desconocido")}`);
    return;
  }

  revalidatePath("/admin/productos");
  redirect(`/admin/productos/${result.productId}/editar`);
}

export async function updateProductAction(
  productId: string,
  formData: FormData,
): Promise<void> {
  const section_slug = formData.get("section_slug")?.toString() || "";
  const slug = formData.get("slug")?.toString() || "";
  const title = formData.get("title")?.toString() || "";
  const priceStr = formData.get("price")?.toString() || "0";
  const description = formData.get("description")?.toString() || null;
  const sku = formData.get("sku")?.toString() || null;
  const active = formData.get("active") === "on";
  const image_url = formData.get("image_url")?.toString() || null;

  // Validación básica
  if (!section_slug || !slug || !title) {
    redirect(`/admin/productos/${productId}/editar?error=campos_requeridos`);
    return;
  }

  const price = parseFloat(priceStr);
  if (isNaN(price) || price < 0) {
    redirect(`/admin/productos/${productId}/editar?error=precio_invalido`);
    return;
  }

  const input: AdminProductInput = {
    section_slug,
    slug,
    title,
    price,
    description,
    sku,
    active,
    image_url,
  };

  const result = await updateAdminProduct(productId, input);

  if (!result.success) {
    redirect(`/admin/productos/${productId}/editar?error=${encodeURIComponent(result.error || "error_desconocido")}`);
    return;
  }

  revalidatePath("/admin/productos");
  redirect("/admin/productos");
}

