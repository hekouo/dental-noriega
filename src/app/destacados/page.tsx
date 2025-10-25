// src/app/destacados/page.tsx
import { sanitizeFeatured } from "@/lib/data/sanitizeFeatured";
import FeaturedGrid from "@/components/FeaturedGrid";

export const revalidate = 300;

export default async function DestacadosPage() {
  const products = await sanitizeFeatured(12);

  // Protege contra vacío:
  if (!products?.length) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Productos Destacados</h1>
        <p className="text-gray-600">Sin destacados por ahora.</p>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Productos Destacados</h1>
      <FeaturedGrid title="Destacados" products={products} />
    </div>
  );
}
