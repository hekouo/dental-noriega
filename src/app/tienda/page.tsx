import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import FeaturedGrid from "@/components/FeaturedGrid";
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";
import { ROUTES } from "@/lib/routes";
import ProductsGridSkeleton from "@/components/products/ProductsGridSkeleton";
import { AlertCircle, MessageCircle } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import { HelpWidget } from "@/components/support/HelpWidget";
import { TrustBanners } from "@/components/marketing/TrustBanners";
import QuickSearchBar from "@/components/search/QuickSearchBar";
import SectionExplorer from "@/components/catalog/SectionExplorer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Tienda",
  description:
    "Explora todos los productos disponibles en Depósito Dental Noriega. Insumos, equipos e instrumental odontológico organizados por categorías.",
  openGraph: {
    title: "Tienda | Depósito Dental Noriega",
    description:
      "Explora todos los productos disponibles. Insumos, equipos e instrumental odontológico organizados por categorías.",
    type: "website",
  },
  alternates: {
    canonical: "/tienda",
  },
};


async function FeaturedItemsSection() {
  const featured = await getFeaturedItems();
  const whatsappUrl = getWhatsAppUrl("Hola, busco productos dentales en Depósito Dental Noriega.");

  if (featured.length === 0) {
    return (
      <div className="mb-12">
        <div className="bg-card rounded-xl border border-border p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            No hay productos para mostrar
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
      </div>
    );
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-semibold tracking-tight mb-2 text-gray-900 dark:text-foreground">
        Productos destacados
      </h2>
      <p className="text-sm text-gray-600 dark:text-muted-foreground mb-6">
        Productos recomendados que suelen interesar a nuestros clientes
      </p>
      <FeaturedGrid items={featured} />
    </div>
  );
}

export default async function TiendaPage() {

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mini-hero con beneficios */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:py-16">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3">
              Tienda
            </h1>
            <p className="text-base sm:text-lg text-primary-100 max-w-2xl mx-auto">
              Explora todos los productos disponibles en Depósito Dental Noriega y arma tus pedidos por sección o por necesidad clínica.
            </p>
          </div>
          
          {/* Beneficios con iconos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-8">
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-white/10 backdrop-blur-sm">
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="font-semibold text-sm sm:text-base mb-1">Envío Rápido</h3>
              <p className="text-xs sm:text-sm text-primary-100">Entrega en tiempo récord</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-white/10 backdrop-blur-sm">
              <svg className="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              <h3 className="font-semibold text-sm sm:text-base mb-1">Atención WhatsApp</h3>
              <p className="text-xs sm:text-sm text-primary-100">Soporte personalizado</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-white/10 backdrop-blur-sm">
              <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-semibold text-sm sm:text-base mb-1">Puntos de Lealtad</h3>
              <p className="text-xs sm:text-sm text-primary-100">Gana con cada compra</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Banners */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <TrustBanners />
      </div>

      {/* Quick Search Bar */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <QuickSearchBar />
      </div>

      {/* Section Explorer */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <SectionExplorer />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Suspense
          fallback={
            <div className="mb-12">
              <h2 className="text-2xl font-semibold tracking-tight mb-2 text-gray-900">
                Productos destacados
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Productos recomendados que suelen interesar a nuestros clientes
              </p>
              <ProductsGridSkeleton count={8} />
            </div>
          }
        >
          <FeaturedItemsSection />
        </Suspense>

      </div>

      {/* Help Widget */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        <HelpWidget context="shop" />
      </div>
    </div>
  );
}
