// src/app/destacados/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";
import FeaturedGrid from "@/components/FeaturedGrid";
import ProductsGridSkeleton from "@/components/products/ProductsGridSkeleton";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Productos destacados",
  description:
    "Productos recomendados que suelen interesar a nuestros clientes. Insumos dentales destacados seleccionados especialmente para ti.",
  openGraph: {
    title: "Productos destacados | Depósito Dental Noriega",
    description:
      "Productos recomendados que suelen interesar a nuestros clientes. Insumos dentales destacados seleccionados especialmente para ti.",
    type: "website",
  },
};

/**
 * Verifica si las variables de entorno de Supabase están presentes
 */
function hasSupabaseEnvs(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function DestacadosContent() {
  const items = await getFeaturedItems();
  const hasEnvs = hasSupabaseEnvs();

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-700 mb-2 font-medium">
          {hasEnvs
            ? "No hay productos destacados en este momento"
            : "Catálogo no disponible"}
        </p>
        <p className="text-sm text-gray-600 mb-6">
          Explora nuestras categorías o busca productos específicos
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/tienda"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium min-h-[44px] inline-flex items-center justify-center"
          >
            Ver tienda completa
          </Link>
          <Link
            href="/buscar"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium min-h-[44px] inline-flex items-center justify-center"
          >
            Buscar productos
          </Link>
        </div>
      </div>
    );
  }

  return <FeaturedGrid items={items} />;
}

export default async function DestacadosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-2 text-gray-900">
          Productos destacados
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Productos recomendados que suelen interesar a nuestros clientes
        </p>
        <Suspense fallback={<ProductsGridSkeleton count={8} />}>
          <DestacadosContent />
        </Suspense>
      </div>
    </div>
  );
}
