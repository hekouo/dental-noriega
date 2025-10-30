import { notFound, redirect } from "next/navigation";
import {
  getBySectionSlug,
  getProductBySlugAnySection,
} from "@/lib/supabase/catalog";
import { formatMXNFromCents } from "@/lib/utils/currency";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import ProductActions from "@/components/product/ProductActions.client";
import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import { Package, Truck, Shield } from "lucide-react";

type Props = {
  params: { section: string; slug: string };
};

export default async function ProductDetailPage({ params }: Props) {
  const { section, slug } = params;

  // Buscar producto por sección y slug
  const product = await getBySectionSlug(section, slug);

  // Si no se encuentra en la sección especificada, buscar en cualquier sección
  if (!product) {
    const anySectionProduct = await getProductBySlugAnySection(slug);
    if (anySectionProduct) {
      // Redirigir a la URL canónica
      redirect(
        `/catalogo/${anySectionProduct.section}/${anySectionProduct.product_slug}`,
      );
    }
  }

  // Si no se encuentra en ningún lado, 404
  if (!product) {
    notFound();
  }

  const image_url = product.image_url;
  const price = formatMXNFromCents(product.price_cents);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href={ROUTES.home()} className="hover:text-primary-600">
              Inicio
            </Link>
            <span>/</span>
            <Link
              href={ROUTES.catalogIndex()}
              className="hover:text-primary-600"
            >
              Catálogo
            </Link>
            <span>/</span>
            <Link
              href={`/catalogo/${product.section}`}
              className="hover:text-primary-600"
            >
              {product.section}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{product.title}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Imagen */}
          <div className="space-y-4">
            <ImageWithFallback
              src={image_url}
              alt={product.title ?? "Producto"}
              width={800}
              height={800}
              square
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>

          {/* Información del producto */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.title}
              </h1>
              <p className="text-lg text-gray-600 capitalize">
                {product.section}
              </p>
            </div>

            {/* Precio */}
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary-600">{price}</div>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.in_stock
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {product.in_stock ? "En stock" : "Agotado"}
                </span>
              </div>
            </div>

            {/* Controles de compra */}
            <ProductActions
              product={{
                id: product.id,
                title: product.title,
                section: product.section,
                product_slug: product.product_slug,
                price_cents: product.price_cents,
                in_stock: product.in_stock ?? undefined,
              }}
            />

            {/* Características */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t">
              <div className="flex items-center space-x-3">
                <Package className="h-5 w-5 text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Envío</p>
                  <p className="text-xs text-gray-600">
                    Gratis en pedidos +$500
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Truck className="h-5 w-5 text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Entrega</p>
                  <p className="text-xs text-gray-600">1-3 días hábiles</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Garantía</p>
                  <p className="text-xs text-gray-600">30 días</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
