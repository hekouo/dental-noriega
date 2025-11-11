import "server-only";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct } from "@/lib/catalog/getProduct.server";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import ProductActions from "@/components/product/ProductActions.client";
import ProductViewTracker from "@/components/ProductViewTracker.client";
import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import { Package, Truck, Shield } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  params: { section: string; slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const siteName =
    process.env.NEXT_PUBLIC_SITE_NAME ?? "Depósito Dental Noriega";
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://dental-noriega.vercel.app";
  const section = decodeURIComponent(params.section ?? "");
  const slug = decodeURIComponent(params.slug ?? "");

  // Intentar obtener producto
  let product: Awaited<ReturnType<typeof getProduct>> = null;
  try {
    product = await getProduct(section, slug);
  } catch {
    // Silenciar errores en build - usar fallback
  }

  if (!product) {
    const title = `Producto no disponible | ${siteName}`;
    return {
      title,
      description: "Producto no disponible.",
      robots: { index: false },
    };
  }

  const title = `${product.title} | ${siteName}`;
  const description =
    product.description?.slice(0, 150) ?? `${product.title} en ${siteName}`;
      const image = product.image_url ?? "/og/cover.jpg";
  const url = `${base}/catalogo/${product.section}/${product.slug}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url,
      siteName,
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: product.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const section = decodeURIComponent(params.section ?? "");
  const slug = decodeURIComponent(params.slug ?? "");

  const product = await getProduct(section, slug);

  if (!product) {
    return notFound(); // 404 limpio, no error
  }

  const image_url = product.image_url;
  const price = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(product.price);
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://dental-noriega.vercel.app";
  const canonicalUrl = `${base}/catalogo/${product.section}/${product.slug}`;
  const soldOut = !(product.active ?? true) || !(product.inStock ?? false);

    // JSON-LD Product schema
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description:
        product.description ?? `${product.title} en Depósito Dental Noriega`,
      image: image_url ? [image_url] : [],
      url: canonicalUrl,
      offers: {
        "@type": "Offer",
        price: product.price > 0 ? product.price.toFixed(2) : "0",
        priceCurrency: "MXN",
        availability: !soldOut && product.price > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url: canonicalUrl,
      },
    };

    return (
      <div className="min-h-screen bg-gray-50">
        {/* JSON-LD Product schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Analítica: view_item */}
        <ProductViewTracker
          productId={product.id}
          productName={product.title}
          priceCents={Math.round(product.price * 100)}
        />

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
                  .replace(/\b\w/g, (l: string) => l.toUpperCase())}
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
                <div className="text-4xl font-bold text-primary-600">
                  {price}
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      !soldOut
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {!soldOut ? "En stock" : "Agotado"}
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
                  price_cents: Math.round(product.price * 100),
                  in_stock: !soldOut,
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
                    <p className="text-sm font-medium text-gray-900">
                      Garantía
                    </p>
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
