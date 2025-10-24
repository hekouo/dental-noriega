// src/app/catalogo/[section]/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { loadProductBySlug } from "@/lib/data/catalog-sections";
import { formatPrice } from "@/lib/utils/catalog";
import { pointsFor, getPointsRate } from "@/lib/utils/points";
import { ROUTES } from "@/lib/routes";
import { QuantitySelector } from "@/components/QuantitySelector";
import ProductImage from "@/components/ProductImage";
import PointsBadge from "@/components/PointsBadge";

export const revalidate = 300; // Cache 5 minutos

type Props = { params: { section: string; slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadProductBySlug(params.section, params.slug);

  if (!data) {
    return {
      title: "Producto no encontrado",
    };
  }

  const { product, section } = data;
  const title = `${product.title} - ${section.sectionName} | Depósito Dental Noriega`;
  const description =
    product.description ||
    `Compra ${product.title} en ${section.sectionName}. Precio: ${formatPrice(product.price)}. Envío gratis.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.image
        ? [
            {
              url: product.image,
              width: 800,
              height: 600,
              alt: product.title,
            },
          ]
        : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const data = await loadProductBySlug(params.section, params.slug);

  if (!data) {
    return notFound();
  }

  const { section, product } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href={ROUTES.section(section.sectionSlug)}
          className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
        >
          <span>← Volver a {section.sectionName}</span>
        </Link>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Imagen */}
            <div className="relative w-full aspect-square bg-gray-100 rounded-xl overflow-hidden">
              <ProductImage
                src={product.image}
                resolved={product.imageResolved}
                alt={product.title}
                sizes="(min-width: 768px) 50vw, 100vw"
                priority // LCP en ficha de producto
              />
            </div>

            {/* Información */}
            <div className="flex flex-col">
              <div className="mb-2">
                <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full">
                  {section.sectionName}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {product.title}
              </h1>

              {product.description && (
                <p className="text-gray-700 leading-relaxed mb-6">
                  {product.description}
                </p>
              )}

              <div className="mb-2">
                <div className="text-4xl font-bold text-primary-600">
                  {formatPrice(product.price)}
                </div>
              </div>

              <div className="mb-2 flex items-center gap-2">
                <PointsBadge points={pointsFor(product.price, 1)} />
                <span className="text-xs text-gray-500">
                  (1 punto por cada ${getPointsRate()} MXN)
                </span>
              </div>

              <div className="mb-6"></div>

              {/* Selector de cantidad y botones - Client Component */}
              <QuantitySelector
                productTitle={product.title}
                sectionName={section.sectionName}
                price={product.price}
                product={product}
                sectionSlug={section.sectionSlug}
              />

              {/* Info adicional */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-600">
                  <strong>Nota:</strong> Los precios pueden variar sin previo
                  aviso. Consulta disponibilidad y tiempos de entrega.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
