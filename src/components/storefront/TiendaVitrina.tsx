import Link from "next/link";
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";
import { getSections } from "@/lib/catalog/getSections";
import { ROUTES } from "@/lib/routes";
import { LayoutGrid, Sparkles } from "lucide-react";
import ProductRail from "./ProductRail";
import SectionLinksRail from "./SectionLinksRail";
import BentoDestacadosTile from "./BentoDestacadosTile.client";

/**
 * Vitrina /tienda: bento + rails con data existente.
 * Fallback: si fetch falla, retorna null y la página muestra el grid actual.
 */
export default async function TiendaVitrina() {
  let featured: Awaited<ReturnType<typeof getFeaturedItems>> = [];
  let sections: Awaited<ReturnType<typeof getSections>> = [];

  try {
    const [f, s] = await Promise.all([
      getFeaturedItems(),
      getSections(8),
    ]);
    featured = f ?? [];
    sections = s ?? [];
  } catch {
    return null;
  }

  const hasFeatured = featured.length > 0;
  const hasSections = sections.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Bento: 2–4 tiles */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        role="presentation"
      >
        {/* Tile editorial (copy) */}
        <div className="rounded-xl border border-stone-200/90 dark:border-gray-700 bg-gradient-to-br from-stone-50 to-amber-50/30 dark:from-gray-800/80 dark:to-amber-900/10 p-6 sm:p-8 flex flex-col justify-center min-h-[200px]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100/90 dark:bg-amber-900/30 border border-amber-200/70 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 mb-4">
            <Sparkles className="w-6 h-6" aria-hidden />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-2">
            Productos para tu consultorio
          </h2>
          <p className="text-sm text-stone-600 dark:text-gray-400">
            Insumos, equipos e instrumental organizados por categoría. Envío rápido y puntos de lealtad.
          </p>
        </div>

        {/* Tile Destacados (rail corto) */}
        <div className="sm:col-span-2 lg:col-span-1 min-h-[280px]">
          <BentoDestacadosTile items={featured} />
        </div>

        {/* Tile Explora por categoría */}
        <Link
          href={ROUTES.tienda() + "#section-explorer-heading"}
          className="rounded-xl border border-stone-200/90 dark:border-gray-700 bg-white dark:bg-gray-800/80 p-6 sm:p-8 flex flex-col items-center justify-center gap-3 min-h-[200px] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-premium tap-feedback group"
          aria-label="Explorar por categorías"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 border border-primary-200/70 dark:border-primary-800/50 text-primary-600 dark:text-primary-400 group-hover:bg-primary-200 dark:group-hover:bg-primary-900/50 transition-colors">
            <LayoutGrid className="w-6 h-6" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            Explora por categoría
          </h3>
          <p className="text-sm text-stone-500 dark:text-gray-400">
            Ver secciones
          </p>
        </Link>
      </div>

      {/* Rail Destacados (solo si hay data) */}
      {hasFeatured && (
        <ProductRail
          items={featured}
          title="Destacados"
          showPrevNext
          className="mt-6"
        />
      )}

      {/* Rail Top por categoría (solo si hay sections) */}
      {hasSections && (
        <SectionLinksRail
          sections={sections}
          title="Explora por categoría"
          className="mt-8"
        />
      )}
    </div>
  );
}
