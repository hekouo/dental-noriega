"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  resolveProductClient,
  type ResolveResult,
} from "@/lib/data/resolveProduct.client";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import RecentlyViewed from "@/components/RecentlyViewed";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import buttonStyles from "@/components/ui/button.module.css";

type Props = {
  section: string;
  slug: string;
  children: React.ReactNode;
};

export default function ProductResolver({ section, slug, children }: Props) {
  const router = useRouter();
  const [resolveResult, setResolveResult] = useState<ResolveResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const redirectedRef = useRef(false); // Proteger contra ciclos de redirección

  useEffect(() => {
    const resolve = async () => {
      try {
        const result = await resolveProductClient(section, slug);
        setResolveResult(result);

        const hasRedirect =
          !!result &&
          result.ok === true &&
          "redirectTo" in result &&
          typeof (result as { redirectTo?: string }).redirectTo === "string" &&
          (result as { redirectTo: string }).redirectTo.length > 0;

        // Si hay redirect, hacer redirect automático (una sola vez)
        if (hasRedirect && !redirectedRef.current) {
          redirectedRef.current = true;
          router.replace((result as { redirectTo: string }).redirectTo);
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando producto...</p>
          </div>
        </div>
      </div>
    );
  }

  if (resolveResult && !resolveResult.ok) {
    const suggestions = resolveResult?.suggestions ?? [];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              No encontramos este producto
            </h1>
            <p className="text-gray-600 mb-6">
              El producto que buscas no está disponible en este momento.
            </p>

            {suggestions.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">
                  Quizás te interese:
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.slice(0, 4).map((suggestion, index) => (
                    <Link
                      key={index}
                      href={`/catalogo/${suggestion.section}/${suggestion.product_slug}`}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-medium text-gray-900">
                        {suggestion.title || suggestion.product_slug}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {suggestion.section}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={ROUTES.catalogIndex()}
                className={`${buttonStyles.primary} px-4`}
              >
                Ver Catálogo
              </Link>
              <Link
                href={ROUTES.home()}
                className={`${buttonStyles.secondary} px-4`}
              >
                Ir al Inicio
              </Link>
            </div>
          </div>

          <RecentlyViewed />
        </div>
      </div>
    );
  }

  // Si el producto se resolvió correctamente, mostrar el contenido
  if (resolveResult && resolveResult.ok && resolveResult.product) {
    const { product, section: resolvedSection } = resolveResult;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link
            href={ROUTES.section(resolvedSection)}
            className="text-primary-600 hover:text-primary-700 mb-4 inline-block"
          >
            <span>← Volver a {resolvedSection}</span>
          </Link>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
              {/* Imagen */}
              <div className="relative w-full aspect-square bg-gray-100 rounded-xl overflow-hidden">
                <ImageWithFallback
                  src={product.image ?? undefined}
                  alt={product.title}
                  width={800}
                  height={800}
                  square
                  className="object-contain"
                />
              </div>

              {/* Detalles del Producto */}
              <div className="flex flex-col justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {product.title}
                  </h1>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-primary-600">
                      ${product.price || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex gap-4">
                    <button className={`${buttonStyles.primary} flex-1`}>
                      <span>Agregar al Carrito</span>
                    </button>
                    <button className={`${buttonStyles.secondary} flex-1`}>
                      <span>Comprar Ahora</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Especificaciones
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>SKU: {product.id || "N/A"}</li>
                <li>Categoría: {resolvedSection}</li>
              </ul>
            </div>
          </div>

          <RecentlyViewed />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
