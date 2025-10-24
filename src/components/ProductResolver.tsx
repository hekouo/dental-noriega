"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveProductClient, type ResolveResult } from "@/lib/data/resolveProduct.client";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import RecentlyViewed from "@/components/RecentlyViewed";

type Props = {
  section: string;
  slug: string;
  children: React.ReactNode;
};

export default function ProductResolver({ section, slug, children }: Props) {
  const router = useRouter();
  const [resolveResult, setResolveResult] = useState<ResolveResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      try {
        const result = await resolveProductClient(section, slug);
        setResolveResult(result);
        
        // Si hay redirect, hacer redirect automático
        if (result?.ok && result.redirectTo) {
          router.replace(result.redirectTo);
          return;
        }
      } catch (error) {
        console.error("[ProductResolver] Error:", error);
      } finally {
        setLoading(false);
      }
    };

    resolve();
  }, [section, slug, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando producto...</p>
        </div>
      </div>
    );
  }

  // Si no se encontró el producto, mostrar página 404 enriquecida
  if (resolveResult && !resolveResult.ok) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              No encontramos este producto
            </h1>
            <p className="text-gray-600 mb-6">
              El producto que buscas no está disponible, pero tenemos algunas sugerencias para ti.
            </p>
          </div>

          {/* Sugerencias */}
          {resolveResult.suggestions.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Productos similares</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resolveResult.suggestions.map((suggestion, index) => (
                  <Link
                    key={index}
                    href={ROUTES.product(suggestion.section, suggestion.slug)}
                    className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-medium text-gray-900 mb-2">
                      {suggestion.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {suggestion.section.replace(/-/g, ' ')}
                    </p>
                    <p className="text-xs text-primary-600">
                      Similitud: {Math.round(suggestion.score * 100)}%
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Botón a sección sugerida */}
          {resolveResult.guessedSection && (
            <div className="text-center mb-8">
              <Link
                href={ROUTES.section(resolveResult.guessedSection)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Ir a {resolveResult.guessedSection.replace(/-/g, ' ')}
              </Link>
            </div>
          )}

          {/* Vistos recientemente */}
          <RecentlyViewed />
        </div>
      </div>
    );
  }

  // Si se encontró el producto, renderizar contenido normal
  return <>{children}</>;
}
