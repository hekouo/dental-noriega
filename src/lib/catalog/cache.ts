import { revalidateTag } from "next/cache";

export const FEATURED_TAG = "featured";
export const CATALOG_TAG = "catalog";

export function revalidateFeatured() {
  revalidateTag(FEATURED_TAG);
}

export function revalidateCatalog() {
  revalidateTag(CATALOG_TAG);
}
