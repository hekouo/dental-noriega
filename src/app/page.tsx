import Link from "next/link";
import dynamicImport from "next/dynamic";
import { ROUTES } from "@/lib/routes";
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import FeaturedGrid from "@/components/FeaturedGrid";
import { buttonBase, buttonPrimary } from "@/lib/styles/button";

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

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const items = await getFeaturedItems();

  // Sanity check: si el array llega vacío, registra un log una sola vez
  if (!items?.length) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[featured] empty result in runtime");
    }
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Depósito Dental
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-100">
            Equipamiento e instrumental odontológico de calidad
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={ROUTES.destacados()}
              className={`${buttonBase} rounded-lg bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3`}
            >
              <span>Ver Productos Destacados</span>
            </Link>
            <Link
              href={ROUTES.catalogIndex()}
              className={`${buttonBase} rounded-lg bg-primary-700 text-white hover:bg-primary-800 text-lg px-8 py-3`}
            >
              <span>Explorar Catálogo</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Productos Destacados */}
      <section className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Destacados</h2>
        <FeaturedCarousel items={items} />
      </section>

      <section className="container mx-auto px-4 py-8 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">También te puede interesar</h3>
        </div>
        <FeaturedGrid items={items} />
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <ShoppingBagIcon width={32} height={32} />
              </div>
              <h3 className="font-semibold mb-2">Compra Fácil</h3>
              <p className="text-gray-600 text-sm">
                Carrito persistente y checkout rápido
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <PackageIcon width={32} height={32} />
              </div>
              <h3 className="font-semibold mb-2">Entrega o Recogida</h3>
              <p className="text-gray-600 text-sm">
                Elige la opción que más te convenga
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <AwardIcon width={32} height={32} />
              </div>
              <h3 className="font-semibold mb-2">Programa de Puntos</h3>
              <p className="text-gray-600 text-sm">
                Gana puntos en cada compra
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <TruckIcon width={32} height={32} />
              </div>
              <h3 className="font-semibold mb-2">Envío Seguro</h3>
              <p className="text-gray-600 text-sm">Seguimiento de tu pedido</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para equipar tu consultorio?
          </h2>
          <p className="text-gray-600 mb-8">
            Crea tu cuenta y comienza a ganar puntos con cada compra
          </p>
          <Link
            href={ROUTES.cuenta()}
            className={`${buttonPrimary} text-lg px-8 py-3`}
          >
            <span>Crear Cuenta</span>
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
