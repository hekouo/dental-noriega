// src/app/catalogo/[section]/[slug]/not-found.tsx
import Link from "next/link";
import { getProductsBySectionFromView } from "@/lib/catalog/getProductsBySectionFromView.server";
import SearchResultCard from "@/components/SearchResultCard";
import { ROUTES } from "@/lib/routes";
import { Package } from "lucide-react";

type Props = {
  params: { section: string; slug: string };
};

export default async function ProductNotFound({ params }: Props) {
  // Obtener 4 sugerencias de la misma sección
  const suggestions = await getProductsBySectionFromView(params.section, 4, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Producto no encontrado</h1>
          <p className="text-primary-100">
            Lo sentimos, no pudimos encontrar el producto que buscas
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow p-12 text-center mb-8">
          <Package size={64} className="mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-2">Producto no disponible</h2>
          <p className="text-gray-600 mb-6">
            El producto que buscas no existe o ha sido eliminado.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href={ROUTES.catalogIndex()} className="btn btn-primary">
              <span>Ver catálogo completo</span>
            </Link>
            <Link href={ROUTES.destacados()} className="btn btn-outline">
              <span>Ver destacados</span>
            </Link>
          </div>
        </div>

        {suggestions.length > 0 && (
          <div>
            <h3 className="text-2xl font-bold mb-6">
              Productos similares en {params.section.replace(/-/g, " ")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {suggestions.map((item) => (
                <SearchResultCard
                  key={item.id}
                  item={{
                    id: item.id,
                    section: item.section,
                    product_slug: item.product_slug,
                    title: item.title,
                    price_cents: item.price_cents ?? 0,
                    image_url: item.image_url ?? null,
                    in_stock: item.in_stock ?? null,
                    is_active: item.is_active ?? true,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
