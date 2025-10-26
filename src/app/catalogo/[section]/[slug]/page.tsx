// src/app/catalogo/[section]/[slug]/page.tsx
import { redirect } from "next/navigation";
import { getProductBySectionSlug, getProductBySlugAnySection } from "@/lib/catalog/getProduct.server";
import ProductDetailPage from "@/components/pdp/ProductDetailPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: { section: string; slug: string } };

async function resolveFallback(slug: string) {
  try {
    const { resolveFallback: findFuzzy } = await import("@/lib/catalog/getProduct.server");
    return await findFuzzy(slug);
  } catch {
    return { suggestions: [] };
  }
}

export default async function Page({ params }: Props) {
  const { section, slug } = params;

  // 1) Intento canónico server-first
  const product = await getProductBySectionSlug(section, slug);
  if (product) {
    return <ProductDetailPage product={product} />;
  }

  // 2) Búsqueda por slug en cualquier sección
  const alt = await getProductBySlugAnySection(slug);
  if (alt) {
    redirect(`/catalogo/${alt.section}/${alt.slug}`);
  }

  // 3) Plan C: resolver (sin sección)
  const result = await resolveFallback(slug);

  if (result && 'product' in result && result.product) {
    redirect(`/catalogo/${result.product.section}/${result.product.slug}`);
  }

  // 4) 404 enriquecido
  const suggestions = Array.isArray(result?.suggestions)
    ? result.suggestions
    : [];
  return (
    <div className="max-w-5xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-3">
        No encontramos este producto
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        El producto que buscas no está disponible en este momento.
      </p>
      {suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestions.slice(0, 6).map((s: Record<string, unknown>) => (
            <a
              key={`${s.section}-${s.slug}`}
              href={`/catalogo/${s.section}/${s.slug}`}
              className="border rounded-lg p-3 hover:shadow"
            >
              <div className="aspect-square bg-gray-50 rounded mb-2 overflow-hidden">
                {s.imageUrl ? (
                  <img
                    src={String(s.imageUrl)}
                    alt={String(s.title ?? "Producto")}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="text-sm font-medium line-clamp-2">
                {String(s.title ?? s.slug)}
              </div>
              {typeof s.price === "number" && (
                <div className="text-sm text-gray-700 mt-1">
                  ${(s.price / 100).toFixed(2)}
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
