import "server-only";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct } from "@/lib/catalog/getProduct.server";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import ProductActions from "@/components/product/ProductActions.client";
import ProductViewTracker from "@/components/ProductViewTracker.client";
import RecentlyViewedTracker from "@/components/catalog/RecentlyViewedTracker.client";
import RecentlyViewed from "@/components/catalog/RecentlyViewed.client";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import PdpRelatedSection from "./PdpRelatedSection";
import { FREE_SHIPPING_THRESHOLD_MXN } from "@/lib/shipping/freeShipping";
import { LOYALTY_POINTS_PER_MXN } from "@/lib/loyalty/config";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";
import {
  getBreadcrumbsJsonLd,
  getProductJsonLd,
} from "@/lib/seo/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  params: { section: string; slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
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
    const title = `Producto no disponible | ${SITE.name}`;
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

  const title = `${product.title} | ${sectionFormatted} | ${SITE.name}`;
  const description =
    product.description?.trim()?.slice(0, 160) ??
    `Compra ${product.title} en ${SITE.name}. Productos para odontólogos y clínicas en México.`;

  // URL absoluta de la imagen del producto o fallback a OG por defecto
  const og_image_url = product.image_url
    ? new URL(product.image_url, SITE.url).toString()
    : `${SITE.url}${SITE.socialImage}`;

  // URL absoluta de la página del producto
  const productUrl = new URL(
    ROUTES.product(product.section, product.slug),
    SITE.url,
  ).toString();

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: productUrl,
      siteName: SITE.name,
      title,
      description,
      images: [
        {
          url: og_image_url,
          width: 1200,
          height: 630,
          alt: product.title,
        },
      ],
      locale: "es_MX",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [og_image_url],
    },
    alternates: {
      canonical: productUrl,
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
  const productUrl = `${SITE.url}${ROUTES.product(product.section, product.slug)}`;

  // Formatear sección para breadcrumbs y schema
  const sectionLabel = product.section
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());

  // Breadcrumbs JSON-LD
  const breadcrumbsJsonLd = getBreadcrumbsJsonLd([
    { name: "Inicio", url: SITE.url },
    { name: "Catálogo", url: `${SITE.url}${ROUTES.catalogIndex()}` },
    { name: sectionLabel, url: `${SITE.url}${ROUTES.section(product.section)}` },
    { name: product.title },
  ]);

  // Product JSON-LD
  const productJsonLd = getProductJsonLd({
    id: product.id,
    name: product.title,
    description: product.description ?? null,
    sectionName: sectionLabel,
    url: productUrl,
    image_url: image_url ?? null,
    priceCents: product.price > 0 ? Math.round(product.price * 100) : null,
    currency: "MXN",
    inStock: product.in_stock,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Structured Data: Breadcrumbs + Product */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbsJsonLd, productJsonLd]),
        }}
      />

        {/* Analítica: view_item */}
        <ProductViewTracker
          productId={product.id}
          productName={product.title}
          priceCents={Math.round(product.price * 100)}
        />

        {/* Registrar producto como visto recientemente */}
        <RecentlyViewedTracker
          product={{
            id: product.id,
            section: product.section,
            slug: product.slug,
            title: product.title,
            priceCents: Math.round(product.price * 100),
            image_url: product.image_url ?? null,
            inStock: product.in_stock ?? null,
          }}
        />

        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <Breadcrumbs
              items={[
                { href: ROUTES.home(), label: "Inicio" },
                { href: ROUTES.catalogIndex(), label: "Catálogo" },
                {
                  href: ROUTES.section(product.section),
                  label: sectionLabel,
                },
                { label: product.title },
              ]}
            />
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

          {/* Productos vistos recientemente */}
          <RecentlyViewed />
        </div>
      </div>
    );
}
