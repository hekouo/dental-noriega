import dynamicImport from "next/dynamic";
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";
import FeaturedGrid from "@/components/FeaturedGrid";
import SectionHeader from "@/components/ui/SectionHeader";
import { HelpWidget } from "@/components/support/HelpWidget";
import { TrustBanners } from "@/components/marketing/TrustBanners";
import QuizCTA from "@/components/quiz/QuizCTA";
import HeroIntro from "@/components/home/HeroIntro";
import WhyBuySection from "@/components/home/WhyBuySection.client";
import AnimatedSeparator from "@/components/common/AnimatedSeparator";
import BentoSection from "@/components/home/BentoSection";
import CategoryGrid from "@/components/home/CategoryGrid";
import CategorySelector from "@/components/home/CategorySelector";
import ProductsRail from "@/components/home/ProductsRail";
import TestimonialsCarousel from "@/components/home/TestimonialsCarousel";
import FinalCTA from "@/components/home/FinalCTA";

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
      {/* Hero Section - PR-H1: HeroIntro con AmbientBackground + IconRail */}
      <HeroIntro />

      <AnimatedSeparator />
      <BentoSection />
      <AnimatedSeparator />
      <CategoryGrid />

      {/* PR-H3: Destacados compactos + testimonios */}
      <AnimatedSeparator />
      <CategorySelector />
      <ProductsRail items={items} title="Destacados" />
      <TestimonialsCarousel />

      {/* Trust Banners */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <TrustBanners />
      </div>

      {/* Quiz CTA - Móvil arriba del fold */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4 md:hidden">
        <QuizCTA />
      </div>

      {/* Separador visual */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-600 to-transparent" />
      </div>

      {/* También te puede interesar - con fondo sutil */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl my-8 overflow-x-clip">
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

      {/* CTA final editorial - PR-H4 */}
      <AnimatedSeparator />
      <FinalCTA />

      {/* Bloque final con agradecimiento - Cargado dinámicamente */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <FinalThanks />
      </div>

      {/* Help Widget */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <HelpWidget context="home" />
      </div>
    </div>
  );
}
