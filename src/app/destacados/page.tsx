// src/app/destacados/page.tsx
import { getFeaturedProducts } from "@/lib/supabase/catalog";
import FeaturedGrid from "@/components/FeaturedGrid";

export const revalidate = 300;

export default async function DestacadosPage() {
  const items = await getFeaturedProducts();

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Productos Destacados</h1>
      <FeaturedGrid items={items} />
    </div>
  );
}
