import "server-only";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProduct } from "@/lib/catalog/getProduct.server";
import { getProductImages } from "@/lib/catalog/getProductImages.server";
import { sortProductImages } from "@/lib/catalog/sortProductImages";
import ProductGallery from "@/components/pdp/ProductGallery.client";
import ProductActions from "@/components/product/ProductActions.client";
import ProductViewTracker from "@/components/ProductViewTracker.client";
import PdpStickyCTA from "@/components/pdp/PdpStickyCTA.client";
import StickyAddToCartBar from "@/components/product/StickyAddToCartBar.client";
import RecentlyViewedTracker from "@/components/catalog/RecentlyViewedTracker.client";
import RecentlyViewed from "@/components/catalog/RecentlyViewed.client";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import RelatedProducts from "@/components/pdp/RelatedProducts";
import { FREE_SHIPPING_THRESHOLD_MXN } from "@/lib/shipping/freeShipping";
import Breadcrumbs from "@/components/pdp/Breadcrumbs";
import ShareProductButton from "@/components/pdp/ShareProductButton.client";
import FreeShippingProgressPDP from "@/components/cart/FreeShippingProgressPDP";
import ProductLoyaltyInfo from "@/components/pdp/ProductLoyaltyInfo";
import TrustBadgesPDP from "@/components/pdp/TrustBadgesPDP";
import TrustStrip from "@/components/ui/TrustStrip";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import {
  getBreadcrumbsJsonLd,
  getProductJsonLd,
} from "@/lib/seo/schema";
import { HelpWidget } from "@/components/support/HelpWidget";

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

  // Obtener imágenes del producto desde product_images
  const productImages = await getProductImages(product.id);
  const sortedImages = sortProductImages(productImages);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
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
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <Breadcrumbs
              sectionSlug={product.section}
              sectionName={sectionLabel}
              productTitle={product.title}
            />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Galería de imágenes - Sticky en desktop */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
              <ProductGallery
                images={sortedImages}
                title={product.title}
                fallbackImage={image_url}
              />
            </div>

            {/* Información del producto — jerarquía premium */}
            <div className="space-y-4 sm:space-y-6">
              <div>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2 leading-tight line-clamp-4">
                      {product.title}
                    </h1>
                    <p className="text-base sm:text-lg text-stone-600 dark:text-gray-400 capitalize">
                      {product.section.replace(/-/g, " ")}
                    </p>
                  </div>
                  {/* Botón compartir */}
                  <ShareProductButton />
                </div>
              </div>

              {/* Precio y disponibilidad — jerarquía fuerte */}
              <div className="space-y-2">
                <div className="text-4xl sm:text-5xl font-bold tracking-tight text-primary-600 dark:text-primary-400">
                  {price}
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  {product.in_stock !== null &&
                    product.in_stock !== undefined && (
                      <span
                        className={
                          product.in_stock ? "pill pill-stock" : "pill pill-stock-out"
                        }
                      >
                        {product.in_stock ? "En stock" : "Agotado"}
                      </span>
                    )}
                  {product.in_stock && (
                    <span className="text-sm text-stone-600 dark:text-gray-400">
                      Lista para envío inmediato
                    </span>
                  )}
                </div>

                {/* Información de envío gratis y puntos */}
                <div className="space-y-1 pt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Envío gratis desde ${FREE_SHIPPING_THRESHOLD_MXN.toLocaleString("es-MX")} MXN en productos.
                  </p>
                  <FreeShippingProgressPDP
                    productPriceCents={Math.round(product.price * 100)}
                    quantity={1}
                  />
                  {product.price > 0 && (
                    <ProductLoyaltyInfo
                      priceCents={Math.round(product.price * 100)}
                    />
                  )}
                </div>
              </div>

              {/* Trust badges */}
              <TrustBadgesPDP />

              {/* Trust strip */}
              <TrustStrip
                variant="pdp"
                items={[
                  {
                    icon: "card",
                    title: "Pago seguro",
                    subtitle: "Con tarjeta",
                  },
                  {
                    icon: "truck",
                    title: "Envío a todo México",
                  },
                  {
                    icon: "whatsapp",
                    title: "¿Dudas? Escríbenos",
                    href: getWhatsAppUrl("Hola, tengo una pregunta sobre este producto.") ?? undefined,
                  },
                  {
                    icon: "shield",
                    title: "Atención postcompra",
                  },
                ]}
              />

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
            <section className="mt-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Descripción del producto
              </h2>
              <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                {product.description.split("\n").map((paragraph, idx) => (
                  <p key={idx} className="mb-3 last:mb-0">
                    {paragraph.trim()}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Acordeones de información */}
          <div className="mt-6 space-y-4">
            {/* Envíos y devoluciones */}
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    Envíos y devoluciones
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  <p>
                    • <strong>Envío gratis</strong> en compras superiores a $2,000 MXN
                  </p>
                  <p>
                    • <strong>Envíos a todo México</strong> con tiempos de entrega de 3-7 días hábiles, dependiendo de tu ubicación
                  </p>
                  <p>
                    • <strong>Devoluciones</strong> disponibles dentro de los primeros 15 días posteriores a la recepción, siempre que el producto esté en su empaque original y sin uso
                  </p>
                  <p>
                    • <strong>Asesoría por WhatsApp</strong> para resolver cualquier duda sobre envíos o devoluciones
                  </p>
                </div>
              </details>
            </section>

            {/* Pagos y facturación */}
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    Pagos y facturación
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  <p>
                    • <strong>Pago seguro</strong> con tarjeta de crédito o débito mediante Stripe
                  </p>
                  <p>
                    • <strong>Facturación disponible</strong> para todas tus compras. Solicítala al finalizar tu pedido
                  </p>
                  <p>
                    • <strong>Precios en MXN</strong> (pesos mexicanos), sin conversiones ni sorpresas
                  </p>
                  <p>
                    • <strong>Procesamiento inmediato</strong> de pagos con confirmación por email
                  </p>
                </div>
              </details>
            </section>

            {/* Garantía */}
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    Garantía
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  <p>
                    • Todos nuestros productos cuentan con <strong>garantía de calidad</strong>
                  </p>
                  <p>
                    • Si recibes un producto defectuoso, te lo <strong>reemplazamos sin costo</strong>
                  </p>
                  <p>
                    • <strong>Devoluciones</strong> disponibles dentro de 15 días posteriores a la recepción
                  </p>
                  <p>
                    • <strong>Contacto directo</strong> por WhatsApp para resolver cualquier incidencia
                  </p>
                </div>
              </details>
            </section>

            {/* Soporte */}
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <span className="text-base font-semibold text-gray-900 dark:text-white">
                    Soporte
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-4 pb-4 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  <p>
                    • <strong>Atención personalizada</strong> por WhatsApp de lunes a viernes
                  </p>
                  <p>
                    • <strong>Respuesta rápida</strong> en minutos, no horas
                  </p>
                  <p>
                    • <strong>Horario de atención</strong>: Lunes a Viernes de 9:00 a 18:00 hrs
                  </p>
                  <p>
                    • <strong>Asesoría técnica</strong> para ayudarte a elegir el producto adecuado
                  </p>
                </div>
              </details>
            </section>
          </div>

          {/* Productos relacionados */}
          <RelatedProducts
            currentId={product.id}
            sectionSlug={product.section}
            limit={8}
          />

          {/* Productos vistos recientemente */}
          <RecentlyViewed />

          {/* Help Widget */}
          <div className="mt-12">
            <HelpWidget context="pdp" productTitle={product.title} />
          </div>
        </div>

        {/* Sticky CTA móvil */}
        <PdpStickyCTA
          product={{
            id: product.id,
            title: product.title,
            section: product.section,
            product_slug: product.slug,
            price_cents: Math.round(product.price * 100),
            image_url: product.image_url ?? undefined,
            in_stock: product.in_stock,
          }}
        />

        {/* Sticky Add To Cart Bar (feature-flagged) */}
        {process.env.NEXT_PUBLIC_STICKY_ATC === "true" && (
          <StickyAddToCartBar
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
        )}
        
        {/* Padding bottom para no tapar contenido con sticky CTA + safe area */}
        <div className="md:hidden h-20" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }} />
      </div>
    );
}
