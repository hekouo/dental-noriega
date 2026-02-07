import Link from "next/link";
import dynamicImport from "next/dynamic";
import { ROUTES } from "@/lib/routes";
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import FeaturedGrid from "@/components/FeaturedGrid";
import { buttonBase, buttonPrimary } from "@/lib/styles/button";
import { MessageCircle } from "lucide-react";
import TrustBadges from "@/components/ui/TrustBadges";
import SectionHeader from "@/components/ui/SectionHeader";
import { getWhatsAppUrl } from "@/lib/whatsapp/config";
import { HelpWidget } from "@/components/support/HelpWidget";
import { TrustBanners } from "@/components/marketing/TrustBanners";
import SectionExplorer from "@/components/catalog/SectionExplorer";
import QuizCTA from "@/components/quiz/QuizCTA";
import HeroCTAs from "@/components/home/HeroCTAs.client";

// Lazy load componentes no críticos
const Testimonials = dynamicImport(() => import("@/components/ui/Testimonials"), {
  ssr: false,
});
const TrustSection = dynamicImport(() => import("@/components/ui/TrustSection"), {
  ssr: false,
});

const ShoppingBagIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1={3} y1={6} x2={21} y2={6} />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const PackageIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <line x1={16.5} y1={9.4} x2={7.5} y2={4.21} />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1={12} y1={22.08} x2={12} y2={12} />
  </svg>
);

const AwardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx={12} cy={8} r={7} />
    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
  </svg>
);

const TruckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <path d="M1 3h15v13H1z" />
    <path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx={5.5} cy={18.5} r={2.5} />
    <circle cx={18.5} cy={18.5} r={2.5} />
  </svg>
);

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

      {/* ¿Por qué comprar con Depósito Dental Noriega? */}
      <section className="py-16 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            title="¿Por qué comprar con Depósito Dental Noriega?"
            subtitle="Comprometidos con la calidad y el servicio para tu consultorio o clínica"
            showWatermark
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-full mb-4">
                <ShoppingBagIcon width={24} height={24} />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Enfoque en consultorios y clínicas</h3>
              <p className="text-gray-600 text-sm">
                Productos pensados para odontólogos, ortodoncistas y clínicas que compran de forma recurrente.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-full mb-4">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Atención directa por WhatsApp</h3>
              <p className="text-gray-600 text-sm">
                Te ayudamos a resolver dudas de códigos, medidas, compatibilidad y existencias antes de comprar.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-full mb-4">
                <TruckIcon width={24} height={24} />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Envíos a todo México</h3>
              <p className="text-gray-600 text-sm">
                Trabajamos con paqueterías confiables y te compartimos tu guía para seguir el pedido en todo momento.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-full mb-4">
                <AwardIcon width={24} height={24} />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Sistema de puntos de lealtad</h3>
              <p className="text-gray-600 text-sm">
                Cada compra acumula puntos que puedes usar como descuento en pedidos futuros.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 hover:-translate-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-full mb-4">
                <PackageIcon width={24} height={24} />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Catálogo claro y precios en MXN</h3>
              <p className="text-gray-600 text-sm">
                Ves el precio final en pesos mexicanos, sin sorpresas ni conversiones.
              </p>
            </div>
          </div>
        </div>
      </section>

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
