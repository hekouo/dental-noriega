// src/app/destacados/page.tsx
import Link from "next/link";
import { getFeatured } from "@/lib/catalog/getFeatured.server";
import FeaturedGrid from "@/components/FeaturedGrid";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * Verifica si las variables de entorno de Supabase están presentes
 */
function hasSupabaseEnvs(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default async function DestacadosPage() {
  const items = await getFeatured();
  const hasEnvs = hasSupabaseEnvs();

  // Sanity check: si el array llega vacío, registra un log una sola vez
  if (!items?.length) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[featured] empty result in runtime");
    }
  }

  if (items.length === 0) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl font-bold mb-6">Productos Destacados</h1>
        <div className="p-6 bg-gray-50 rounded-lg">
          <p className="text-gray-700 mb-4">
            {hasEnvs
              ? "No hay productos destacados en este momento."
              : "Catálogo no disponible."}
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
