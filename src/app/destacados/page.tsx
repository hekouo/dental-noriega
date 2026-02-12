// src/app/destacados/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";
import FeaturedGrid from "@/components/FeaturedGrid";
import ProductsGridSkeleton from "@/components/products/ProductsGridSkeleton";
import SectionHeader from "@/components/ui/SectionHeader";
import { AlertCircle, MessageCircle } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import DestacadosHero from "@/components/storefront/DestacadosHero";
import ProductRail from "@/components/storefront/ProductRail";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Productos destacados",
  description:
    "Productos recomendados que suelen interesar a nuestros clientes. Insumos dentales destacados seleccionados especialmente para ti.",
  openGraph: {
    title: "Productos destacados | Depósito Dental Noriega",
    description:
      "Productos recomendados que suelen interesar a nuestros clientes. Insumos dentales destacados seleccionados especialmente para ti.",
    type: "website",
  },
  alternates: {
    canonical: "/destacados",
  },
};

/**
 * Verifica si las variables de entorno de Supabase están presentes
 */
function hasSupabaseEnvs(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function DestacadosContent() {
  const items = await getFeaturedItems();
  const hasEnvs = hasSupabaseEnvs();
  const whatsappUrl = getWhatsAppUrl("Hola, busco productos destacados en Depósito Dental Noriega.");

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
        <div className="w-20 h-20 mx-auto rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-primary-600 dark:text-primary-400" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          {hasEnvs
            ? "No hay productos para mostrar"
            : "Catálogo no disponible"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Prueba buscar por nombre o escríbenos y te ayudamos.
        </p>
        
        {/* Chips con sugerencias */}
        <div className="mb-8">
          <p className="text-xs text-muted-foreground mb-3">Sugerencias:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["guantes", "brackets", "resina", "anestesia", "algodon"].map((suggestion) => (
              <Link
                key={suggestion}
                href={`/buscar?q=${encodeURIComponent(suggestion)}`}
                className="px-4 py-2 bg-muted hover:bg-primary-100 dark:hover:bg-primary-900/30 border border-border rounded-full text-sm text-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px] inline-flex items-center justify-center"
              >
                {suggestion}
              </Link>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={ROUTES.buscar()}
            className="px-6 py-3 bg-primary-600 dark:bg-primary-700 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors duration-200 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 min-h-[44px] inline-flex items-center justify-center"
          >
            Ir a buscar
          </Link>
          {whatsappUrl && (
            <Link
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border-2 border-green-500 dark:border-green-600 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-200 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 min-h-[44px] inline-flex items-center justify-center"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Preguntar por WhatsApp
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <ProductRail items={items} title="Destacados" showPrevNext className="mb-8" />
      <FeaturedGrid items={items} />
    </>
  );
}

export default async function DestacadosPage() {
  return (
    <div className="bg-gray-50">
      <DestacadosHero />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <Suspense fallback={<ProductsGridSkeleton count={8} />}>
          <DestacadosContent />
        </Suspense>
      </div>
    </div>
  );
}
