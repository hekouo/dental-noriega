import Link from "next/link";
import FeaturedGrid from "@/components/FeaturedGrid";
import { getFeaturedItems } from "@/lib/catalog/getFeatured.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
  const hasEnvs = hasSupabaseEnvs();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Catálogo Completo</h1>
          <p className="text-primary-100">Explora todas nuestras categorías</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-4">Destacados</h2>
        {featured.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded-lg">
            <p className="text-gray-700 mb-4">
              {hasEnvs
                ? "No hay productos destacados en este momento."
                : "Catálogo no disponible."}
            </p>
            <Link
              href="/buscar"
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 inline-block"
            >
              Buscar productos
            </Link>
          </div>
        ) : (
          <FeaturedGrid items={featured} />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-8 text-center"
            >
              <span className="block">
                <h2 className="text-xl font-semibold text-gray-900 hover:text-primary-600">
                  {category.title}
                </h2>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
