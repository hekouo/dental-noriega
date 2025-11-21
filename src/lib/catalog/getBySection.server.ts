import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";
import { mapDbToCatalogItem } from "./mapDbToProduct";
import {
  CATALOG_PAGE_SIZE,
  calculateOffset,
  type CatalogSortOption,
  type PriceRangeKey,
  getPriceRangeBounds,
} from "./config";

export type GetBySectionResult = {
  items: ReturnType<typeof mapDbToCatalogItem>[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
};

export async function getBySection(
  section: string,
  page: number = 1,
  sort: CatalogSortOption = "relevance",
  inStockOnly: boolean = false,
  priceRange: PriceRangeKey = "all",
): Promise<GetBySectionResult> {
  noStore();
  const sb = createClient();

  const pageSize = CATALOG_PAGE_SIZE;
  const offset = calculateOffset(page, pageSize);

  let query = sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("section", section);

  // Aplicar filtro de stock
  if (inStockOnly) {
    query = query.eq("in_stock", true);
  }

  // Aplicar filtro de rango de precio
  const priceBounds = getPriceRangeBounds(priceRange);
  if (priceBounds) {
    if (priceBounds.minCents !== undefined) {
      query = query.gte("price_cents", priceBounds.minCents);
    }
    if (priceBounds.maxCents !== undefined) {
      query = query.lte("price_cents", priceBounds.maxCents);
    }
  }

  // Aplicar ordenamiento según la opción seleccionada
  switch (sort) {
    case "price_asc":
      query = query.order("price_cents", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price_cents", { ascending: false });
      break;
    case "name_asc":
      query = query.order("title", { ascending: true });
      break;
    case "relevance":
    default:
      // Orden por defecto (más recientes primero)
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query.range(offset, offset + pageSize - 1);

  if (error) throw error;
  
  const items = (data ?? []).map(mapDbToCatalogItem);
  const hasNextPage = items.length === pageSize;

  return {
    items,
    page,
    pageSize,
    hasNextPage,
  };
}
