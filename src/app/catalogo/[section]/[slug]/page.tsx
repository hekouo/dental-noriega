import { notFound, redirect } from "next/navigation";
import { resolveProductBySlug } from "@/lib/catalog/resolveProductBySlug.server";
import { formatMXNFromCents } from "@/lib/utils/currency";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import ProductActions from "@/components/product/ProductActions.client";
import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import { Package, Truck, Shield } from "lucide-react";
import { normalizeSlug } from "@/lib/utils/slug";

export const dynamic = process.env.NODE_ENV === "development" ? "force-dynamic" : "auto";
export const revalidate = 300; // Cache 5 minutos

type Props = {
  params: { section: string; slug: string };
};

export default async function ProductDetailPage({ params }: Props) {
  const { section, slug } = params;
  const normalizedSlug = normalizeSlug(slug);
  const normalizedSection = normalizeSlug(section);

  // Resolver producto por slug (con fallback a vista)
  const product = await resolveProductBySlug(normalizedSlug);

  if (!product) {
    notFound();
  }

  // Redirigir a la ruta canónica si la sección no coincide
  if (normalizeSlug(product.section) !== normalizedSection) {
    redirect(`/catalogo/${product.section}/${product.slug}`);
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
              {product.section
                .replace(/-/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
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
            <div className="relative w-full aspect-square bg-white rounded-lg overflow-hidden shadow-sm">
              <ImageWithFallback
                src={image_url}
                alt={product.title}
                width={800}
                height={800}
                className="w-full h-full object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
          </div>

          {/* Información del producto */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.title}
              </h1>
              <p className="text-lg text-gray-600 capitalize">
                {product.section.replace(/-/g, " ")}
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
                product_slug: product.slug,
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
