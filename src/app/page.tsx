import Link from "next/link";
import dynamicImport from "next/dynamic";
import { ROUTES } from "@/lib/routes";
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import FeaturedGrid from "@/components/FeaturedGrid";
import { buttonPrimary } from "@/lib/styles/button";
import TrustBadges from "@/components/ui/TrustBadges";
import SectionHeader from "@/components/ui/SectionHeader";
import { HelpWidget } from "@/components/support/HelpWidget";
import { TrustBanners } from "@/components/marketing/TrustBanners";
import SectionExplorer from "@/components/catalog/SectionExplorer";
import QuizCTA from "@/components/quiz/QuizCTA";
import HeroCTAs from "@/components/home/HeroCTAs.client";
import WhyBuySection from "@/components/home/WhyBuySection.client";

// Lazy load componentes no críticos
const Testimonials = dynamicImport(() => import("@/components/ui/Testimonials"), {
  ssr: false,
});
const TrustSection = dynamicImport(() => import("@/components/ui/TrustSection"), {
  ssr: false,
});

// Dynamic import para componente no crítico
const FinalThanks = dynamicImport(() => import("@/components/FinalThanks"), {
  ssr: false,
});

import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Equipamiento e instrumental odontológico de calidad. Explora nuestro catálogo de insumos dentales con envío a todo México.",
  openGraph: {
    title: "Depósito Dental Noriega | Insumos dentales en México",
    description:
      "Equipamiento e instrumental odontológico de calidad. Explora nuestro catálogo de insumos dentales con envío a todo México.",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const items = await getFeaturedItems();

  return (
    <div className="min-h-screen overflow-x-clip max-w-full">
      {/* Hero Section - Heritage Dental (solo Home) */}
      <section className="relative bg-hero-heritage text-gray-800 py-10 sm:py-14 md:py-20 px-4 overflow-hidden w-full">
        <div className="relative max-w-6xl mx-auto text-center">
          {/* Headline - serif solo en headings */}
          <h1 className="font-hero text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 sm:mb-6 text-gray-900 leading-tight">
            Buenos días, tu clínica merece compras fáciles.
          </h1>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Atención personalizada por WhatsApp, precios claros en MXN y pago seguro. Envíos a todo México.
          </p>

          {/* CTAs */}
          <HeroCTAs variant="heritage" />

          {/* Trust line - pill badges con borde bronce suave */}
          <div className="mt-6 sm:mt-8 animate-fadeInUp">
            <TrustBadges variant="heritage" />
          </div>
        </div>
      </section>

      {/* Trust Banners */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <TrustBanners />
      </div>

      {/* Quiz CTA - Móvil arriba del fold */}
      <div className="max-w-6xl mx-auto px-4 pb-4 md:hidden">
        <QuizCTA />
      </div>

      {/* Explorar por categorías */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <SectionExplorer
          title="Explora por categoría"
          subtitle="Navega por nuestras categorías de productos"
        />
      </div>

      {/* Productos Destacados */}
      <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <SectionHeader title="Destacados" />
        <FeaturedCarousel items={items} />
      </section>

      {/* Separador visual */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>

      {/* También te puede interesar - con fondo sutil */}
      <section className="max-w-6xl mx-auto px-4 py-8 sm:py-12 bg-gray-50/50 rounded-2xl my-8">
        <SectionHeader
          title="También te puede interesar"
          subtitle="Productos recomendados que suelen interesar a nuestros clientes"
        />
        <FeaturedGrid items={items} />
      </section>

      {/* ¿Por qué comprar con Depósito Dental Noriega? — editorial + RevealOnScroll */}
      <WhyBuySection />

      {/* Trust Section - Lazy loaded */}
      <TrustSection />

      {/* Testimonials - Lazy loaded */}
      <Testimonials />

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-lg sm:text-xl text-gray-700 mb-6 font-medium">
            Insumos dentales confiables, entregados a todo México.
          </p>
          <Link
            href={ROUTES.tienda()}
            className={`${buttonPrimary} text-lg px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-shadow`}
          >
            <span>Ver tienda</span>
          </Link>
        </div>
      </section>

      {/* Bloque final con agradecimiento - Cargado dinámicamente */}
      <div className="max-w-6xl mx-auto px-4">
        <FinalThanks />
      </div>

      {/* Help Widget */}
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <HelpWidget context="home" />
      </div>
    </div>
  );
}
