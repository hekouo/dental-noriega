import Link from "next/link";
import dynamic from "next/dynamic";
import { ShoppingBag, Package, Award, Truck } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { getFeaturedProducts } from "@/lib/data/featured";
import ProductImage from "@/components/ProductImage";
import { formatPrice } from "@/lib/utils/catalog";
import { pointsFor } from "@/lib/utils/points";
import PointsBadge from "@/components/PointsBadge";

// Dynamic import para componente no crítico
const FinalThanks = dynamic(() => import("@/components/FinalThanks"), {
  ssr: false,
});

export const revalidate = 300; // Cache 5 minutos

export default async function HomePage() {
  const featured = await getFeaturedProducts(8);

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
      {featured.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-2">Productos Destacados</h2>
              <p className="text-gray-600">
                Los mejores productos para tu consultorio
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featured.map(({ sectionSlug, item }, idx) => (
                <Link
                  key={`${sectionSlug}-${item.slug}`}
                  href={ROUTES.product(sectionSlug, item.slug)}
                  prefetch={idx < 4} // Solo prefetch en primeros 4
                  className="border rounded-xl p-3 hover:shadow-lg transition-shadow"
                >
                  <span className="block">
                    <div className="relative w-full aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden mb-2">
                      <ProductImage
                        src={item.image}
                        resolved={item.imageResolved}
                        alt={item.title}
                        sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
                        priority={idx === 0} // LCP: priorizar primera imagen
                      />
                    </div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-sm line-clamp-2 flex-1">
                        {item.title}
                      </h3>
                      <PointsBadge points={pointsFor(item.price, 1)} />
                    </div>
                    <p className="text-primary-700 font-semibold">
                      {formatPrice(item.price)}
                    </p>
                  </span>
                </Link>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href={ROUTES.catalogIndex()} className="btn btn-primary">
                <span>Ver Todo el Catálogo</span>
              </Link>
            </div>
          </div>
        </section>
      )}

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
