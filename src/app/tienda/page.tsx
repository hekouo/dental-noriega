import Link from "next/link";
import type { Metadata } from "next";
import FeaturedGrid from "@/components/FeaturedGrid";
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";

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
};

const categories = [
  { title: "Consumibles y Profilaxis", href: "/tienda/consumibles" },
  { title: "Equipos", href: "/tienda/equipos" },
  { title: "Instrumental Clínico", href: "/tienda/instrumental-clinico" },
  { title: "Instrumental Ortodoncia", href: "/tienda/instrumental-ortodoncia" },
  {
    title: "Ortodoncia: Brackets y Tubos",
    href: "/tienda/ortodoncia-brackets",
  },
  { title: "Ortodoncia: Arcos y Resortes", href: "/tienda/ortodoncia-arcos" },
  {
    title: "Ortodoncia: Accesorios y Retenedores",
    href: "/tienda/ortodoncia-accesorios",
  },
];

/**
 * Verifica si las variables de entorno de Supabase están presentes
 */
function hasSupabaseEnvs(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default async function TiendaPage() {
  const featured = await getFeaturedItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">Tienda</h1>
          <p className="text-sm sm:text-base text-primary-100">
            Explora todos los productos disponibles en Depósito Dental Noriega y arma tus pedidos por sección o por necesidad clínica.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {featured.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold tracking-tight mb-2 text-gray-900">
              Productos destacados
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Productos recomendados que suelen interesar a nuestros clientes
            </p>
            <FeaturedGrid items={featured} />
          </div>
        )}

        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-2 text-gray-900">
            Categorías
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Navega por nuestras categorías de productos
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-8 text-center"
                aria-label={`Ver productos de ${category.title}`}
              >
                <span className="block">
                  <h3 className="text-xl font-semibold text-gray-900 hover:text-primary-600">
                    {category.title}
                  </h3>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
