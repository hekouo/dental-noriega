// src/app/destacados/page.tsx
import Link from "next/link";
import { getFeatured } from "@/lib/catalog/getFeatured.server";
import FeaturedGrid from "@/components/FeaturedGrid";

export const dynamic = "force-dynamic"; // temporal hasta estabilizar cache
// opcionalmente: export const revalidate = 60;

export default async function DestacadosPage() {
  const items = await getFeatured();

  if (!items?.length) {
    if (process.env.NEXT_RUNTIME) {
      console.warn("[featured] empty result in runtime");
    }
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Productos Destacados</h1>
        <div className="p-6 bg-gray-50 rounded-lg">
          <p className="text-gray-700 mb-4">
            No hay productos destacados en este momento.
          </p>
          <div className="flex gap-4">
            <Link
              href="/buscar"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Buscar productos
            </Link>
            <Link
              href="/catalogo"
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Ver catálogo completo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Productos Destacados</h1>
      <FeaturedGrid items={items} />
    </div>
  );
}
