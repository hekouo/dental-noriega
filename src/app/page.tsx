import Link from "next/link";
import dynamicImport from "next/dynamic";
import { ShoppingBag, Package, Award, Truck } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getFeatured } from "@/lib/catalog/getFeatured.server";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import FeaturedGrid from "@/components/FeaturedGrid";

// Dynamic import para componente no crítico
const FinalThanks = dynamicImport(() => import("@/components/FinalThanks"), {
  ssr: false,
});

export const revalidate = 60; // Cache leve
export const dynamic = "force-dynamic"; // Si fetch depende de cookies del server wrapper

export default async function HomePage() {
  const items = await getFeatured();

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
              className="btn btn-primary bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3"
            >
              <span>Ver Productos Destacados</span>
            </Link>
            <Link
              href={ROUTES.catalogIndex()}
              className="btn bg-primary-700 text-white hover:bg-primary-800 text-lg px-8 py-3"
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
                <ShoppingBag size={32} />
              </div>
              <h3 className="font-semibold mb-2">Compra Fácil</h3>
              <p className="text-gray-600 text-sm">
                Carrito persistente y checkout rápido
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <Package size={32} />
              </div>
              <h3 className="font-semibold mb-2">Entrega o Recogida</h3>
              <p className="text-gray-600 text-sm">
                Elige la opción que más te convenga
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <Award size={32} />
              </div>
              <h3 className="font-semibold mb-2">Programa de Puntos</h3>
              <p className="text-gray-600 text-sm">
                Gana puntos en cada compra
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 text-primary-600 rounded-full mb-4">
                <Truck size={32} />
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
            className="btn btn-primary text-lg px-8 py-3"
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
