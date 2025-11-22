// src/app/catalogo/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { listSectionsFromCatalog } from "@/lib/supabase/catalog";
import { getSectionsFromCatalogView } from "@/lib/catalog/getSectionsFromCatalogView.server";
import { ROUTES } from "@/lib/routes";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";
// Package icon replaced with inline SVG to reduce bundle size

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explora todas nuestras categorías de productos dentales. Insumos, equipos e instrumental organizados por secciones.",
  openGraph: {
    title: "Catálogo | Depósito Dental Noriega",
    description:
      "Explora todas nuestras categorías de productos dentales. Insumos, equipos e instrumental organizados por secciones.",
    type: "website",
  },
};

export default async function CatalogoIndexPage() {
  let sections = await listSectionsFromCatalog();

  // Fallback: si sections está vacío, usar la vista
  if (sections.length === 0) {
    const fallbackSections = await getSectionsFromCatalogView();
    sections = fallbackSections.map((s) => s.slug);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <Breadcrumbs
            items={[
              { href: ROUTES.home(), label: "Inicio" },
              { label: "Catálogo" },
            ]}
            className="mb-4"
          />
          <h1 className="text-4xl font-bold mb-2">Catálogo Completo</h1>
          <p className="text-primary-100">
            Explora todas nuestras categorías de productos
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {sections.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              width={48}
              height={48}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4 text-gray-400"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <p className="text-gray-500 mb-2">Aún no hay secciones</p>
            <Link href={ROUTES.destacados()} className="btn btn-primary">
              <span>Ver Destacados</span>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <Link
                key={section}
                href={`/catalogo/${section}`}
                prefetch={false}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-8 text-center group"
              >
                <span className="block">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 mb-2">
                    {section
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </h2>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
