import "server-only";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct } from "@/lib/catalog/getProduct.server";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import ProductActions from "@/components/product/ProductActions.client";
import ProductViewTracker from "@/components/ProductViewTracker.client";
import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import PdpRelatedSection from "./PdpRelatedSection";
import { FREE_SHIPPING_THRESHOLD_MXN } from "@/lib/shipping/freeShipping";
import { LOYALTY_POINTS_PER_MXN } from "@/lib/loyalty/config";

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

  // Formatear sección para título legible
  const sectionFormatted = section
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());

  const title = `${product.title} | ${sectionFormatted} | ${siteName}`;
  const description =
    product.description?.slice(0, 150) ??
    `${product.title} - ${sectionFormatted}. Disponible en ${siteName}.`;
  const image = product.image_url ?? "/og-default.jpg";
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
  const soldOut = !product.in_stock || !product.is_active;

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

        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
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
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 mb-2">
                  {product.title}
                </h1>
                <p className="text-base sm:text-lg text-gray-600 capitalize">
                  {product.section.replace(/-/g, " ")}
                </p>
              </div>

              {/* Precio y disponibilidad */}
              <div className="space-y-2">
                <div className="text-4xl font-bold text-primary-600">
                  {price}
                </div>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  {/* Badge de stock mejorado */}
                  {product.in_stock !== null &&
                    product.in_stock !== undefined && (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.in_stock
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {product.in_stock ? "En stock" : "Agotado"}
                      </span>
                    )}
                  {product.in_stock && (
                    <span className="text-sm text-gray-600">
                      Lista para envío inmediato
                    </span>
                  )}
                </div>

                {/* Información de envío gratis y puntos */}
                <div className="space-y-1 pt-2">
                  <p className="text-sm text-gray-500">
                    Envío gratis desde ${FREE_SHIPPING_THRESHOLD_MXN.toLocaleString("es-MX")} MXN en productos.
                  </p>
                  {product.price > 0 && (
                    <p className="text-sm text-amber-700">
                      Acumulas aprox.{" "}
                      {Math.floor(product.price * LOYALTY_POINTS_PER_MXN).toLocaleString("es-MX")}{" "}
                      puntos con este producto.
                    </p>
                  )}
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
                  image_url: product.image_url ?? undefined,
                  in_stock: product.in_stock,
                  is_active: product.is_active,
                }}
              />
            </div>
          </div>

          {/* Descripción del producto */}
          {product.description && (
            <section className="mt-12 bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Descripción del producto
              </h2>
              <div className="prose prose-sm max-w-none text-gray-700">
                {product.description.split("\n").map((paragraph, idx) => (
                  <p key={idx} className="mb-3 last:mb-0">
                    {paragraph.trim()}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Productos relacionados */}
          <PdpRelatedSection
            section={product.section}
            currentProductId={product.id}
          />
        </div>
      </div>
    );
}
