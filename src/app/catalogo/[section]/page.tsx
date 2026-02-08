// src/app/catalogo/[section]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { getBySection } from "@/lib/catalog/getBySection.server";
import { ROUTES } from "@/lib/routes";
import { SITE } from "@/lib/site";
import ProductCard from "@/components/catalog/ProductCard";
import Pagination from "@/components/catalog/Pagination";
import {
  parsePage,
  normalizeSortParam,
  normalizePriceRangeParam,
} from "@/lib/catalog/config";
import dynamicImport from "next/dynamic";
import { Package } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";

const SortSelect = dynamicImport(
  () => import("@/components/catalog/SortSelect.client"),
  { ssr: false },
);

const FiltersSelect = dynamicImport(
  () => import("@/components/catalog/FiltersSelect.client"),
  { ssr: false },
);

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  params: { section: string };
  searchParams: {
    page?: string;
    sort?: string;
    inStock?: string;
    priceRange?: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const section = decodeURIComponent(params.section ?? "").trim();

  // Intentar obtener productos de la sección (solo primera página para metadata)
  let result: Awaited<ReturnType<typeof getBySection>> | null = null;
  try {
    result = await getBySection(section, 1, "relevance", false, "all");
  } catch {
    // Silenciar errores en build - usar fallback
  }
  
  const items = result?.items ?? [];

  const sectionName = section
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const title = `${sectionName} | ${SITE.name}`;
  const description = `Explora ${sectionName} en ${SITE.name}. Productos dentales de calidad para consultorios y clínicas.`;

  // Usar imagen del primer producto si existe, sino OG por defecto
  const og_image_url = items?.[0]?.image_url
    ? new URL(items[0].image_url, SITE.url).toString()
    : `${SITE.url}${SITE.socialImage}`;

  // URL absoluta de la sección
  const sectionUrl = new URL(ROUTES.section(section), SITE.url).toString();

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: sectionUrl,
      siteName: SITE.name,
      title,
      description,
      images: [
        {
          url: og_image_url,
          width: 1200,
          height: 630,
          alt: sectionName,
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
      canonical: sectionUrl,
    },
  };
}

export default async function CatalogoSectionPage({ params, searchParams }: Props) {
  const section = decodeURIComponent(params.section ?? "").trim();
  const page = parsePage(searchParams.page);
  const sort = normalizeSortParam(searchParams.sort);
  const inStockOnly = searchParams.inStock === "true";
  const priceRange = normalizePriceRangeParam(searchParams.priceRange);
  
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

  let result: Awaited<ReturnType<typeof getBySection>> | null = null;
  let errorOccurred = false;

  try {
    result = await getBySection(section, page, sort, inStockOnly, priceRange);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[catalogo/section] Error:", error);
    }
    errorOccurred = true;
  }
  
  const products = result?.items ?? [];

  // Si no hay productos, mostrar mensaje mejorado
  if (products.length === 0 && !errorOccurred) {
    const sectionName = params.section
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    
    const whatsappUrl = getWhatsAppUrl(`Hola, busco productos en la sección "${sectionName}" en Depósito Dental Noriega.`);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <Breadcrumbs
              items={[
                { href: ROUTES.home(), label: "Inicio" },
                { href: ROUTES.catalogIndex(), label: "Catálogo" },
                { label: sectionName },
              ]}
              className="mb-4"
            />
            <h1 className="text-4xl font-bold mb-2">{sectionName}</h1>
            <p className="text-primary-100">
              Por ahora no hay productos en esta sección
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-gray-400" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Por ahora no hay productos en esta sección
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Puedes revisar otras categorías o escribirnos por WhatsApp para conseguirte el producto.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={ROUTES.catalogIndex()}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                Ver todas las secciones del catálogo
              </Link>
              <Link
                href={ROUTES.destacados()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                Ir a destacados
              </Link>
            </div>
            {whatsappUrl && (
              <div className="mt-4">
                <Link
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 border border-green-500 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                >
                  Hablar por WhatsApp
                </Link>
              </div>
            )}
          </div>
        </div>
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
          <Breadcrumbs
            items={[
              { href: ROUTES.home(), label: "Inicio" },
              { href: ROUTES.catalogIndex(), label: "Catálogo" },
              { label: sectionName },
            ]}
            className="mb-4"
          />
          <h1 className="text-4xl font-bold mb-2">{sectionName}</h1>
          <p className="text-primary-100">
            {(() => {
              if (result && page > 1) {
                return `Página ${page}`;
              }
              const productCount = products.length;
              const productText = productCount !== 1 ? "productos" : "producto";
              const availableText = productCount !== 1 ? "disponibles" : "disponible";
              return `${productCount} ${productText} ${availableText}`;
            })()}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Controles de filtros y ordenamiento */}
        <div className="mb-6 flex flex-col gap-4">
          <FiltersSelect
            inStockOnly={inStockOnly}
            priceRange={priceRange}
            basePath={ROUTES.section(section)}
            preserveParams={sort !== "relevance" ? { sort } : {}}
          />
          <div className="flex justify-end">
            <SortSelect
              currentSort={sort}
              basePath={ROUTES.section(section)}
              preserveParams={{
                ...(inStockOnly ? { inStock: "true" } : {}),
                ...(priceRange !== "all" ? { priceRange } : {}),
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 min-w-0">
          {products.map((product, idx) => {
            // Usar ProductCard canónico
            return (
              <ProductCard
                key={product.id}
                id={product.id}
                section={product.section}
                product_slug={product.slug}
                title={product.title}
                price_cents={Math.round(product.price * 100)}
                image_url={product.image_url ?? null}
                in_stock={product.in_stock}
                is_active={product.is_active}
                description={product.description ?? null}
                priority={idx < 4}
                sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              />
            );
          })}
        </div>
        
        {/* Paginación */}
        {result && (
          <Pagination
            page={result.page}
            hasNextPage={result.hasNextPage}
            basePath={ROUTES.section(section)}
            extraQuery={{
              ...(sort !== "relevance" ? { sort } : {}),
              ...(inStockOnly ? { inStock: "true" } : {}),
              ...(priceRange !== "all" ? { priceRange } : {}),
            }}
          />
        )}
      </div>
    </div>
  );
}
