// src/app/catalogo/page.tsx
import Link from "next/link";
import { loadAllSections } from "@/lib/data/catalog-sections";
import { ROUTES } from "@/lib/routes";
import { Package } from "lucide-react";

export const revalidate = 300; // Cache 5 minutos

export default async function CatalogoIndexPage() {
  const sections = await loadAllSections();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Catálogo Completo</h1>
          <p className="text-primary-100">
            Explora todas nuestras categorías de productos
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {sections.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Package size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-2">No se encontraron secciones en el catálogo</p>
            <p className="text-sm text-gray-400">
              Verifica que existan archivos CSV en public/data/
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <Link
                key={section.sectionSlug}
                href={ROUTES.section(section.sectionSlug)}
                prefetch={false}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-8 text-center group"
              >
                <span className="block">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 mb-2">
                    {section.sectionName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {section.items.length} producto{section.items.length !== 1 ? "s" : ""}
                  </p>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
