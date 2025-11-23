import Link from "next/link";
import dynamicImport from "next/dynamic";
import { ROUTES } from "@/lib/routes";
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import FeaturedGrid from "@/components/FeaturedGrid";
import { buttonBase, buttonPrimary } from "@/lib/styles/button";
import { MessageCircle } from "lucide-react";

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
};

export default async function HomePage() {
  const items = await getFeaturedItems();

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-12 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4 sm:mb-6 text-white text-center">
            Insumos dentales para consultorios y clínicas en México
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 text-primary-100">
            Tienda familiar de insumos dentales con envío a todo México y atención por WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4 sm:mb-6">
            <Link
              href={ROUTES.tienda()}
              className={`${buttonBase} rounded-lg bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3`}
            >
              <span>Ver tienda</span>
            </Link>
            <Link
              href={ROUTES.destacados()}
              className={`${buttonBase} rounded-lg bg-primary-700 text-white hover:bg-primary-800 text-lg px-8 py-3`}
            >
              <span>Ver productos destacados</span>
            </Link>
          </div>
          <p className="text-sm sm:text-base text-primary-100 max-w-2xl mx-auto">
            Envío gratis desde $2,000 MXN en productos.
          </p>
        </div>
      </section>

      {/* Productos Destacados */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Destacados</h2>
        <FeaturedCarousel items={items} />
      </section>

      <section className="max-w-6xl mx-auto px-4 py-8 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold tracking-tight">También te puede interesar</h3>
        </div>
        <FeaturedGrid items={items} />
      </section>

      {/* ¿Por qué comprar con Depósito Dental Noriega? */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center mb-8 text-gray-900">
            ¿Por qué comprar con Depósito Dental Noriega?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-full mb-4">
                <ShoppingBagIcon width={24} height={24} />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Enfoque en consultorios y clínicas</h3>
              <p className="text-gray-600 text-sm">
                Productos pensados para odontólogos, ortodoncistas y clínicas que compran de forma recurrente.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-full mb-4">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Atención directa por WhatsApp</h3>
              <p className="text-gray-600 text-sm">
                Te ayudamos a resolver dudas de códigos, medidas, compatibilidad y existencias antes de comprar.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-full mb-4">
                <TruckIcon width={24} height={24} />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Envíos a todo México</h3>
              <p className="text-gray-600 text-sm">
                Trabajamos con paqueterías confiables y te compartimos tu guía para seguir el pedido en todo momento.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 text-primary-600 rounded-full mb-4">
                <AwardIcon width={24} height={24} />
              </div>
              <h3 className="font-semibold mb-2 text-gray-900">Sistema de puntos de lealtad</h3>
              <p className="text-gray-600 text-sm">
                Cada compra acumula puntos que puedes usar como descuento en pedidos futuros.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
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

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-lg sm:text-xl text-gray-700 mb-6">
            Insumos dentales confiables, entregados a todo México.
          </p>
          <Link
            href={ROUTES.tienda()}
            className={`${buttonPrimary} text-lg px-8 py-3`}
          >
            <span>Ver tienda</span>
          </Link>
        </div>
      </section>

      {/* Bloque final con agradecimiento - Cargado dinámicamente */}
      <div className="max-w-6xl mx-auto px-4">
        <FinalThanks />
      </div>
    </main>
  );
}
