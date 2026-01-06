import "server-only";
import Link from "next/link";
import { getRelatedProducts } from "@/lib/catalog/getRelatedProducts";
import ProductCard from "@/components/catalog/ProductCard";
import type { ProductCardProps } from "@/components/catalog/ProductCard";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import { ArrowRight, Package } from "lucide-react";

type RelatedProductsProps = {
  currentId: string;
  sectionSlug: string;
  limit?: number;
};

/**
 * Sección premium de productos relacionados en PDP
 * - Diseño moderno (2025)
 * - Accesible y dark mode friendly
 * - Carrusel horizontal en mobile, grid en desktop
 * - Empty state con CTAs si no hay productos
 */
export default async function RelatedProducts({
  currentId,
  sectionSlug,
  limit = 8,
}: RelatedProductsProps) {
  const relatedProducts = await getRelatedProducts({
    currentId,
    sectionSlug,
    limit,
  });

  // Empty state si no hay productos relacionados
  if (relatedProducts.length === 0) {
    const whatsappUrl = getWhatsAppUrl(
      "Hola, me interesa ver más productos de esta categoría.",
    );

    return (
      <section
        className="mt-12 pt-10 border-t border-gray-200 dark:border-gray-700"
        aria-labelledby="related-products-empty"
      >
        <div className="text-center py-12 px-4">
          <Package className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h2
            id="related-products-empty"
            className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
          >
            Aún no hay relacionados en esta categoría
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Explora nuestra tienda completa o escríbenos para más opciones.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={ROUTES.tienda()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px]"
            >
              Ver tienda
              <ArrowRight size={18} />
            </Link>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 min-h-[44px]"
              >
                <svg
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>
    );
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
    compact: false,
  }));

  return (
    <section
      className="mt-12 pt-10 border-t border-gray-200 dark:border-gray-700"
      aria-labelledby="related-products-heading"
    >
      {/* Heading + microcopy */}
      <div className="mb-6">
        <h2
          id="related-products-heading"
          className="text-2xl font-semibold text-gray-900 dark:text-white mb-1"
        >
          Productos relacionados
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Más opciones de la misma categoría
        </p>
      </div>

      {/* Mobile: carrusel horizontal con snap */}
      <div className="lg:hidden">
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory no-scrollbar">
          {productCards.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-[calc(50%-0.5rem)] snap-start"
            >
              <ProductCard {...product} compact />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: grid 4 columnas */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-6">
        {productCards.map((product) => (
          <ProductCard key={product.id} {...product} />
        ))}
      </div>

      {/* CTA secundaria: Ver más de esta categoría */}
      <div className="mt-6 text-center">
        <Link
          href={ROUTES.section(sectionSlug)}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded min-h-[44px]"
        >
          Ver más de esta categoría
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

