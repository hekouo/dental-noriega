// src/app/destacados/page.tsx
import { sanitizeFeatured } from "@/lib/data/sanitizeFeatured";
import FeaturedGrid from "@/components/FeaturedGrid";

export const revalidate = 300;

export default async function DestacadosPage() {
  const products = await sanitizeFeatured();

  // Con sanitizeFeatured, siempre habrá productos (nunca vacío)

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Productos Destacados</h1>
      <FeaturedGrid title="Destacados" products={products} />
    </div>
  );
}
