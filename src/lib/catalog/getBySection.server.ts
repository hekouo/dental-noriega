import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";
import { mapDbToCatalogItem } from "./mapDbToProduct";
import { CATALOG_PAGE_SIZE, calculateOffset } from "./config";

export type GetBySectionResult = {
  items: ReturnType<typeof mapDbToCatalogItem>[];
  page: number;
  pageSize: number;
  hasNextPage: boolean;
};

export async function getBySection(
  section: string,
  page: number = 1,
): Promise<GetBySectionResult> {
  noStore();
  const sb = createClient();

  const pageSize = CATALOG_PAGE_SIZE;
  const offset = calculateOffset(page, pageSize);

  const { data, error } = await sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("section", section)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

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
