import "server-only";
import { getProductsBySectionFromView } from "@/lib/catalog/getProductsBySectionFromView.server";
import ProductCard from "@/components/catalog/ProductCard";
import type { ProductCardProps } from "@/components/catalog/ProductCard";

type Props = {
  section: string;
  currentProductId: string;
};

/**
 * Componente server-side que muestra productos relacionados en la PDP
 * Usa la misma lógica y helpers que el resto del catálogo
 */
export default async function PdpRelatedSection({
  section,
  currentProductId,
}: Props) {
  // Obtener productos de la misma sección (máximo 8 para tener opciones después de filtrar)
  const products = await getProductsBySectionFromView(section, 8, 0);

  // Filtrar el producto actual y tomar los primeros 4
  const relatedProducts = products
    .filter((p) => p.id !== currentProductId)
    .slice(0, 4);

  // Si no hay productos relacionados, no renderizar nada
  if (relatedProducts.length === 0) {
    return null;
  }

  // Convertir CatalogItem a ProductCardProps
  const productCards: ProductCardProps[] = relatedProducts.map((product) => ({
    id: product.id,
    section: product.section,
    product_slug: product.product_slug,
    title: product.title,
    price_cents: product.price_cents,
    image_url: product.image_url,
    in_stock: product.in_stock,
    is_active: product.is_active,
    description: product.description,
    priority: false,
    sizes: "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw",
  }));

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-xl font-semibold mb-4">También te puede interesar</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {productCards.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>
    </section>
  );
}

