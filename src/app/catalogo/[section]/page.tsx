// src/app/catalogo/[section]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { listBySection } from "@/lib/supabase/catalog";
import { getProductsBySectionFromView } from "@/lib/catalog/getProductsBySectionFromView.server";
import { formatMXN, mxnFromCents } from "@/lib/utils/currency";
import { ROUTES } from "@/lib/routes";
import { MessageCircle } from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import CatalogCardControls from "@/components/CatalogCardControls";
import { generateWhatsAppLink } from "@/lib/utils/whatsapp";

export const revalidate = 300; // Cache 5 minutos

type Props = { params: { section: string } };

export default async function CatalogoSectionPage({ params }: Props) {
  let products = await listBySection(params.section);

  // Fallback: si no hay productos desde el fetch principal, usar la vista
  if (products.length === 0) {
    products = await getProductsBySectionFromView(params.section);
  }

  if (products.length === 0) {
    return notFound();
  }

  const sectionName = params.section
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

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
          <h1 className="text-4xl font-bold mb-2">{sectionName}</h1>
          <p className="text-primary-100">
            {products.length} producto
            {products.length !== 1 ? "s" : ""} disponible
            {products.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, idx) => {
            const whatsappHref = generateWhatsAppLink(
              process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "",
              `Hola, me interesa: ${product.title} (${sectionName}).`,
            );

            return (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col"
              >
                <Link
                  href={`/catalogo/${product.section}/${product.product_slug}`}
                  prefetch={idx < 4}
                >
                  <span className="block">
                    <div className="relative w-full aspect-square bg-white">
                      <ImageWithFallback
                        src={product.image_url}
                        alt={product.title}
                        width={400}
                        height={400}
                        className="w-full h-full object-contain"
                        sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                        priority={idx === 0}
                      />
                    </div>
                  </span>
                </Link>

                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link
                      href={`/catalogo/${product.section}/${product.product_slug}`}
                      prefetch={false}
                    >
                      <span className="block">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-primary-600">
                          {product.title}
                        </h3>
                      </span>
                    </Link>
                  </div>

                  <p className="text-xl font-bold text-primary-600 mb-3">
                    {formatMXN(mxnFromCents(product.price_cents))}
                  </p>

                  <div className="mt-auto space-y-2">
                    <CatalogCardControls item={product} />

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
      </div>
    </div>
  );
}
