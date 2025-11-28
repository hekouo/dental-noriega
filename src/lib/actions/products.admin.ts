"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAdminProduct,
  updateAdminProduct,
  addAdminProductImage,
  setAdminPrimaryImage,
  deleteAdminProductImage,
  type AdminProductInput,
} from "@/lib/supabase/products.admin.server";

export async function createProductAction(formData: FormData): Promise<void> {
  const sectionId = formData.get("section_id")?.toString() || "";
  const slug = formData.get("slug")?.toString() || "";
  const title = formData.get("title")?.toString() || "";
  const priceStr = formData.get("price")?.toString() || "0";
  const stockQtyStr = formData.get("stock_qty")?.toString() || "";
  const description = formData.get("description")?.toString() || null;
  const sku = formData.get("sku")?.toString() || null;
  const active = formData.get("active") === "on";
  const image_url = formData.get("image_url")?.toString() || null;

  // Validación básica
  if (!sectionId || !slug || !title) {
    redirect("/admin/productos/nuevo?error=campos_requeridos");
    return;
  }

  const priceMxn = parseFloat(priceStr);
  if (isNaN(priceMxn) || priceMxn < 0) {
    redirect("/admin/productos/nuevo?error=precio_invalido");
    return;
  }

  const stockQty = stockQtyStr ? parseInt(stockQtyStr, 10) : null;
  if (stockQty !== null && (isNaN(stockQty) || stockQty < 0)) {
    redirect("/admin/productos/nuevo?error=stock_invalido");
    return;
  }

  const input: AdminProductInput = {
    sectionId,
    slug,
    title,
    priceMxn,
    stockQty,
    description,
    sku,
    active,
    image_url,
  };

  const result = await createAdminProduct(input);

  if (!result.success) {
    redirect(
      `/admin/productos/nuevo?error=${encodeURIComponent(result.error || "error_desconocido")}`,
    );
    return;
  }

  // Revalidar rutas del catálogo público
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo", "layout");
  revalidatePath("/tienda");
  revalidatePath("/destacados");

  redirect(`/admin/productos/${result.productId}/editar`);
}

export async function updateProductAction(
  productId: string,
  formData: FormData,
): Promise<void> {
  const sectionId = formData.get("section_id")?.toString() || "";
  const slug = formData.get("slug")?.toString() || "";
  const title = formData.get("title")?.toString() || "";
  const priceStr = formData.get("price")?.toString() || "0";
  const stockQtyStr = formData.get("stock_qty")?.toString() || "";
  const description = formData.get("description")?.toString() || null;
  const sku = formData.get("sku")?.toString() || null;
  const active = formData.get("active") === "on";
  const image_url = formData.get("image_url")?.toString() || null;

  // Validación básica
  if (!sectionId || !slug || !title) {
    redirect(`/admin/productos/${productId}/editar?error=campos_requeridos`);
    return;
  }

  const priceMxn = parseFloat(priceStr);
  if (isNaN(priceMxn) || priceMxn < 0) {
    redirect(`/admin/productos/${productId}/editar?error=precio_invalido`);
    return;
  }

  const stockQty = stockQtyStr ? parseInt(stockQtyStr, 10) : null;
  if (stockQty !== null && (isNaN(stockQty) || stockQty < 0)) {
    redirect(`/admin/productos/${productId}/editar?error=stock_invalido`);
    return;
  }

  const input: AdminProductInput = {
    sectionId,
    slug,
    title,
    priceMxn,
    stockQty,
    description,
    sku,
    active,
    image_url,
  };

  const result = await updateAdminProduct(productId, input);

  if (!result.success) {
    redirect(
      `/admin/productos/${productId}/editar?error=${encodeURIComponent(result.error || "error_desconocido")}`,
    );
    return;
  }

  // Revalidar rutas del catálogo público
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo", "layout");
  revalidatePath("/tienda");
  revalidatePath("/destacados");

  redirect("/admin/productos");
}

export async function addProductImageAction(formData: FormData): Promise<void> {
  const productId = formData.get("productId")?.toString() || "";
  const url = formData.get("url")?.toString() || "";
  const makePrimary = formData.get("makePrimary") === "on";

  if (!productId || !url) {
    redirect(`/admin/productos/${productId}/editar?error=campos_requeridos`);
    return;
  }

  const result = await addAdminProductImage(productId, url, makePrimary);

  if (!result.success) {
    redirect(
      `/admin/productos/${productId}/editar?error=${encodeURIComponent(result.error || "error_desconocido")}`,
    );
    return;
  }

  // Revalidar rutas
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}/editar`);
  revalidatePath("/catalogo", "layout");
  revalidatePath("/tienda");
  revalidatePath("/destacados");

  redirect(`/admin/productos/${productId}/editar`);
}

export async function setPrimaryProductImageAction(
  formData: FormData,
): Promise<void> {
  const productId = formData.get("productId")?.toString() || "";
  const imageId = formData.get("imageId")?.toString() || "";

  if (!productId || !imageId) {
    redirect(`/admin/productos/${productId}/editar?error=campos_requeridos`);
    return;
  }

  const result = await setAdminPrimaryImage(productId, imageId);

  if (!result.success) {
    redirect(
      `/admin/productos/${productId}/editar?error=${encodeURIComponent(result.error || "error_desconocido")}`,
    );
    return;
  }

  // Revalidar rutas
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}/editar`);
  revalidatePath("/catalogo", "layout");
  revalidatePath("/tienda");
  revalidatePath("/destacados");

  redirect(`/admin/productos/${productId}/editar`);
}

export async function deleteProductImageAction(
  formData: FormData,
): Promise<void> {
  const productId = formData.get("productId")?.toString() || "";
  const imageId = formData.get("imageId")?.toString() || "";

  if (!productId || !imageId) {
    redirect(`/admin/productos/${productId}/editar?error=campos_requeridos`);
    return;
  }

  const result = await deleteAdminProductImage(productId, imageId);

  if (!result.success) {
    redirect(
      `/admin/productos/${productId}/editar?error=${encodeURIComponent(result.error || "error_desconocido")}`,
    );
    return;
  }

  // Revalidar rutas
  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${productId}/editar`);
  revalidatePath("/catalogo", "layout");
  revalidatePath("/tienda");
  revalidatePath("/destacados");

  redirect(`/admin/productos/${productId}/editar`);
}
