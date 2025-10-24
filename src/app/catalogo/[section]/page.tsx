// src/app/catalogo/[section]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSectionBySlug } from "@/lib/data/catalog-sections";
import { formatPrice } from "@/lib/utils/catalog";
import { pointsFor } from "@/lib/utils/points";
import { ROUTES } from "@/lib/routes";
import { waLink } from "@/lib/site";
import { MessageCircle, Package, ShoppingCart } from "lucide-react";
import ProductImage from "@/components/ProductImage";
import PointsBadge from "@/components/PointsBadge";
import AddToCartBtn from "@/components/AddToCartBtn";

export const revalidate = 300; // Cache 5 minutos

type Props = { params: { section: string } };

export default async function CatalogoSectionPage({ params }: Props) {
  const section = await loadSectionBySlug(params.section);

  if (!section) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <Link
            href={ROUTES.catalogIndex()}
            className="text-primary-100 hover:text-white mb-2 inline-block"
          >
            <span>← Volver al catálogo</span>
          </Link>
          <h1 className="text-4xl font-bold mb-2">{section.sectionName}</h1>
          <p className="text-primary-100">
            {section.items.length} producto
            {section.items.length !== 1 ? "s" : ""} disponible
            {section.items.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {section.items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Package size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No hay productos en esta sección</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {section.items.map((item, idx) => {
              const whatsappHref = waLink(
                `Hola, me interesa: ${item.title} (${section.sectionName}).`,
              );

              return (
                <div
                  key={item.slug}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
                >
                  <Link
                    href={ROUTES.product(section.sectionSlug, item.slug)}
                    prefetch={idx < 4}
                  >
                    <span className="block">
                      <div className="relative w-full aspect-square bg-gray-100">
                        <ProductImage
                          src={item.image}
                          alt={item.title}
                          sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                          priority={idx === 0} // LCP: primera imagen
                        />
                      </div>
                    </span>
                  </Link>

                  <div className="p-4 flex flex-col flex-grow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link
                        href={ROUTES.product(section.sectionSlug, item.slug)}
                        prefetch={false}
                      >
                        <span className="block">
                          <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-primary-600">
                            {item.title}
                          </h3>
                        </span>
                      </Link>
                      <PointsBadge points={pointsFor(item.price, 1)} />
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <p className="text-xl font-bold text-primary-600 mb-3">
                      {formatPrice(item.price)}
                    </p>

                    <div className="mt-auto space-y-2">
                      <AddToCartBtn
                        productId={`${section.sectionSlug}/${item.slug}`}
                        productTitle={item.title}
                        productPrice={item.price}
                        qty={1}
                        imageUrl={item.image || item.imageResolved}
                        className="w-full relative inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold gap-2 text-neutral-900 bg-gradient-to-b from-white to-neutral-200 shadow-[inset_0_2px_6px_rgba(255,255,255,0.9),0_6px_14px_rgba(0,0,0,0.20)] ring-1 ring-inset ring-neutral-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-400 active:translate-y-[2px] active:shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_4px_10px_rgba(0,0,0,0.18)] transition-transform"
                      >
                        <ShoppingCart size={20} />
                        <span>Agregar al carrito</span>
                      </AddToCartBtn>

                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm underline opacity-80 hover:opacity-100"
                      >
                        <MessageCircle size={14} />
                        <span>Consultar por WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
