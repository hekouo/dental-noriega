import Papa from "papaparse";

export type FeaturedItem = {
  sku: string;
  title: string;
  variant: string;
  pack: string;
  price: number;
  currency: string;
  imageUrl: string;
  badge?: string;
  featured: string;
};

export async function loadFeatured(): Promise<FeaturedItem[]> {
  const res = await fetch("/featured.csv", { cache: "no-store" });
  const csv = await res.text();
  const { data } = Papa.parse<FeaturedItem>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return (data || [])
    .filter((x) => String(x.featured).toLowerCase() === "true")
    .map((x) => ({ ...x, price: Number((x as any).price ?? 0) }));
}
