// src/app/catalogo/[section]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { getBySection } from "@/lib/catalog/getBySection.server";
import { ROUTES } from "@/lib/routes";
import ProductCard from "@/components/catalog/ProductCard";
import Pagination from "@/components/catalog/Pagination";
import { parsePage } from "@/lib/catalog/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Props = {
  params: { section: string };
  searchParams: { page?: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const siteName =
    process.env.NEXT_PUBLIC_SITE_NAME ?? "Depósito Dental Noriega";
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://dental-noriega.vercel.app";
  const section = decodeURIComponent(params.section ?? "").trim();

  // Intentar obtener productos de la sección (solo primera página para metadata)
  let result: Awaited<ReturnType<typeof getBySection>> | null = null;
  try {
    result = await getBySection(section, 1);
  } catch {
    // Silenciar errores en build - usar fallback
  }
  
  const items = result?.items ?? [];

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

export default async function CatalogoSectionPage({ params, searchParams }: Props) {
  const section = decodeURIComponent(params.section ?? "").trim();
  const page = parsePage(searchParams.page);
  
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
    result = await getBySection(section, page);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[catalogo/section] Error:", error);
    }
    errorOccurred = true;
  }
  
  const products = result?.items ?? [];

  // Si no hay productos, mostrar mensaje
  if (products.length === 0 && !errorOccurred) {
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
            {result && page > 1
              ? `Página ${page}`
              : `${products.length} producto${products.length !== 1 ? "s" : ""} disponible${products.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          />
        )}
      </div>
    </div>
  );
}
