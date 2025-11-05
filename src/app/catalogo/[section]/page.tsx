// src/app/catalogo/[section]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { listBySection } from "@/lib/supabase/catalog";
import { getProductsBySectionFromView } from "@/lib/catalog/getProductsBySectionFromView.server";
import { getProductsBySection } from "@/lib/catalog/getBySection.server";
import { formatMXN, mxnFromCents } from "@/lib/utils/currency";
import { ROUTES } from "@/lib/routes";
import { MessageCircle } from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import CatalogCardControls from "@/components/CatalogCardControls";
import { generateWhatsAppLink } from "@/lib/utils/whatsapp";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * Verifica si las variables de entorno de Supabase están presentes
 */
function hasSupabaseEnvs(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

type Props = { params: { section: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const siteName =
    process.env.NEXT_PUBLIC_SITE_NAME ?? "Depósito Dental Noriega";
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://dental-noriega.vercel.app";
  const section = decodeURIComponent(params.section ?? "").trim();

  // Intentar obtener productos de la sección (sin cookies, solo Supabase directo)
  let items: Awaited<ReturnType<typeof getProductsBySection>> = [];
  try {
    items = await getProductsBySection(section, 1);
  } catch {
    // Silenciar errores en build - usar fallback
  }

  const sectionName = section
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const title = `${sectionName} | ${siteName}`;
  const description = `Explora ${sectionName} en ${siteName}.`;
  const image = items?.[0]?.image_url ?? "/og/cover.jpg";
  const url = `${base}/catalogo/${section}`;

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
          alt: sectionName,
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

export default async function CatalogoSectionPage({ params }: Props) {
  const section = decodeURIComponent(params.section ?? "").trim();
  if (!section) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Sección inválida</h1>
        <p className="text-sm opacity-70 mt-1">
          Prueba en{" "}
          <Link href="/destacados" className="underline">
            Destacados
          </Link>{" "}
          o{" "}
          <Link href="/buscar" className="underline">
            buscar
          </Link>
          .
        </p>
      </div>
    );
  }

  const hasEnvs = hasSupabaseEnvs();
  let productsFromCatalog: Awaited<ReturnType<typeof listBySection>> = [];
  let productsFromView: Awaited<
    ReturnType<typeof getProductsBySectionFromView>
  > = [];
  let errorOccurred = false;

  try {
    productsFromCatalog = await listBySection(section);

    // Fallback: si no hay productos desde el fetch principal, usar la vista
    if (productsFromCatalog.length === 0) {
      productsFromView = await getProductsBySectionFromView(section);
    }
  } catch (error) {
    console.error("[catalogo/section] Error:", error);
    errorOccurred = true;
  }

  // Usar productos del catálogo si hay, sino de la vista
  const products =
    productsFromCatalog.length > 0
      ? productsFromCatalog
      : productsFromView.map((p) => ({
          id: p.id,
          section: p.section,
          product_slug: p.product_slug,
          title: p.title,
          price_cents: p.price_cents ?? 0,
          image_url: p.image_url ?? null,
          in_stock:
            (p.stock_qty ?? null) !== null ? (p.stock_qty ?? 0) > 0 : null,
          stock_qty: p.stock_qty ?? null,
        }));

  // Si faltan envs y no hay productos, mostrar mensaje de catálogo no disponible
  if (!hasEnvs && products.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Catálogo no disponible</h1>
        <p className="text-sm opacity-70 mt-1">
          Intenta en{" "}
          <Link href="/destacados" className="underline">
            Destacados
          </Link>{" "}
          o{" "}
          <Link href="/buscar" className="underline">
            buscar
          </Link>
          .
        </p>
      </div>
    );
  }

  // Si hay envs pero no hay productos, mostrar mensaje de sección vacía
  if (hasEnvs && products.length === 0 && !errorOccurred) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Sin productos en esta sección</h1>
        <p className="text-sm opacity-70 mt-1">
          Prueba en{" "}
          <Link href="/destacados" className="underline">
            Destacados
          </Link>{" "}
          o{" "}
          <Link href="/buscar" className="underline">
            buscar
          </Link>
          .
        </p>
      </div>
    );
  }

  // Si hubo error y no hay productos, mostrar mensaje genérico
  if (errorOccurred && products.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">
          No pudimos cargar los productos
        </h1>
        <p className="text-sm opacity-70 mt-1">
          Intenta en{" "}
          <Link href="/destacados" className="underline">
            Destacados
          </Link>{" "}
          o{" "}
          <Link href="/buscar" className="underline">
            buscar
          </Link>
          .
        </p>
      </div>
    );
  }

  const sectionName = params.section
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <Link
            href={ROUTES.catalogIndex()}
            className="text-primary-100 hover:text-white mb-2 inline-block"
          >
            <span>← Volver al catálogo</span>
          </Link>
          <h1 className="text-4xl font-bold mb-2">{sectionName}</h1>
          <p className="text-primary-100">
            {products.length} producto
            {products.length !== 1 ? "s" : ""} disponible
            {products.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, idx) => {
            const whatsappHref = generateWhatsAppLink(
              process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "",
              `Hola, me interesa: ${product.title} (${sectionName}).`,
            );

            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
              >
                <Link
                  href={`/catalogo/${product.section}/${product.product_slug}`}
                  prefetch={idx < 4}
                >
                  <span className="block">
                    <div className="relative w-full aspect-square bg-white">
                      <ImageWithFallback
                        src={product.image_url}
                        alt={product.title}
                        width={400}
                        height={400}
                        className="w-full h-full object-contain"
                        sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                        priority={idx === 0}
                      />
                    </div>
                  </span>
                </Link>

                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link
                      href={`/catalogo/${product.section}/${product.product_slug}`}
                      prefetch={false}
                    >
                      <span className="block">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-primary-600">
                          {product.title}
                        </h3>
                      </span>
                    </Link>
                  </div>

                  <p className="text-xl font-bold text-primary-600 mb-3">
                    {formatMXN(mxnFromCents(product.price_cents))}
                  </p>

                  <div className="mt-auto space-y-2">
                    <CatalogCardControls item={product} />

                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm underline opacity-80 hover:opacity-100"
                    >
                      <MessageCircle size={14} />
                      <span>Consultar por WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
