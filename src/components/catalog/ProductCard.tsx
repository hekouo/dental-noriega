// src/components/catalog/ProductCard.tsx
"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import QuantityInput from "@/components/cart/QuantityInput";
import { useCartStore } from "@/lib/store/cartStore";
import { formatMXN, mxnFromCents } from "@/lib/utils/currency";
import { normalizePrice, hasPurchasablePrice } from "@/lib/catalog/model";
import { getWhatsAppHref } from "@/lib/whatsapp";
import { estimatePointsForPriceCents } from "@/lib/loyalty/utils";
import { trackAddToCart, trackWhatsappClick } from "@/lib/analytics/events";
import { launchCartConfetti } from "@/lib/ui/confetti";
import { useToast } from "@/components/ui/ToastProvider.client";
import { ROUTES } from "@/lib/routes";
import { requiresSelections } from "@/components/product/usePdpAddToCartGuard";
import { useRouter } from "next/navigation";

/**
 * Props unificadas para ProductCard
 * Compatible con CatalogItem y FeaturedItem
 */
export type ProductCardProps = {
  id: string;
  section: string;
  product_slug: string;
  title: string;
  price_cents?: number | null;
  image_url?: string | null;
  in_stock?: boolean | null;
  is_active?: boolean | null;
  description?: string | null;
  // Opciones de visualización
  priority?: boolean;
  sizes?: string;
  compact?: boolean;
  // Para búsqueda: highlight del query
  highlightQuery?: string;
};

/**
 * Tarjeta canónica de producto reutilizable
 * 
 * Características:
 * - Imagen con fallback
 * - Título con link a PDP
 * - Precio formateado
 * - Estado de stock
 * - Stepper de cantidad (min 1, sin permitir 0 ni negativos)
 * - Botón "Agregar al carrito"
 * - Botón "Consultar por WhatsApp" si está agotado o sin precio
 * - Accesible y responsive
 */
export default function ProductCard({
  id,
  section,
  product_slug,
  title,
  price_cents,
  image_url,
  in_stock,
  is_active,
  description,
  priority = false,
  sizes,
  compact = false,
  highlightQuery,
}: ProductCardProps) {
  const addToCart = useCartStore((s) => s.addToCart);
  const { showToast } = useToast();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const busyRef = useRef(false);
  
  // Verificar si el producto requiere selecciones obligatorias
  const needsSelections = requiresSelections({
    title,
    product_slug,
  });

  // Normalizar precio
  const priceCents = normalizePrice(price_cents);
  const price = priceCents > 0 ? mxnFromCents(priceCents) : null;

  // Estado de disponibilidad
  // soldOut solo es true si explícitamente in_stock === false o is_active === false
  // null/undefined en in_stock no significa agotado, significa "no especificado" (disponible por defecto)
  const soldOut = in_stock === false || is_active === false;
  const canPurchase = hasPurchasablePrice({
    price_cents,
    in_stock,
    is_active,
  });

  // Link a PDP
  const href = `/catalogo/${section}/${product_slug}`;

  // WhatsApp link para consultas
  const waHref = getWhatsAppHref(
    `Hola, me interesa el producto: ${title} (${product_slug}). ¿Lo tienes disponible?`,
  );

  // Handler para agregar al carrito o navegar al PDP si requiere selecciones
  const handleAddToCart = () => {
    if (!canPurchase || busyRef.current || !price) return;
    
    // Si requiere selecciones, navegar al PDP en lugar de agregar
    if (needsSelections) {
      showToast({
        message: "Este producto requiere seleccionar opciones",
        variant: "info",
        durationMs: 2000,
      });
      router.push(href);
      return;
    }
    
    busyRef.current = true;
    setIsAdding(true);

    addToCart({
      id,
      title,
      price,
      qty,
      image_url: image_url ?? undefined,
      selected: true,
    });

    // Analytics: add_to_cart
    trackAddToCart({
      productId: id,
      section,
      slug: product_slug,
      title,
      priceCents: priceCents > 0 ? priceCents : null,
      quantity: qty,
      source: "card",
    });

    // Confeti al agregar al carrito
    void launchCartConfetti();

    // Mostrar toast de confirmación
    showToast({
      message: "Agregado al carrito",
      variant: "success",
      actionLabel: "Ver carrito",
      actionHref: ROUTES.carrito(),
      durationMs: 1400,
    });

    setTimeout(() => {
      busyRef.current = false;
      setIsAdding(false);
    }, 250);
  };

  // Handler para cambio de cantidad
  const handleQtyChange = (next: number) => {
    setQty(Math.min(99, Math.max(1, next)));
  };

  // Highlight del query en el título (para búsqueda)
  const renderTitle = () => {
    if (!highlightQuery || !title) return <>{title}</>;

    const escaped = highlightQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = title.split(regex);

    return (
      <>
        {parts.map((part, i) => {
          // Verificar si esta parte coincide con el query (case-insensitive)
          const matches = regex.test(part);
          // Resetear el regex para la siguiente iteración
          regex.lastIndex = 0;
          return matches ? <mark key={i}>{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </>
    );
  };

  return (
    <div 
      className="rounded-2xl border border-gray-200/80 p-3 flex flex-col bg-white shadow-sm hover:shadow-xl transition-all duration-300 ease-out hover:-translate-y-1 active:scale-[0.98] group"
      style={{
        animation: "fadeInUp 0.5s ease-out backwards",
        animationDelay: "var(--delay, 0ms)",
      }}
    >
      {/* Imagen con link a PDP - mejorado con zoom sutil */}
      <Link href={href} prefetch={false} className="block overflow-hidden rounded-lg">
        <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden group-hover:from-gray-100 group-hover:to-gray-200 transition-all duration-300">
          <ImageWithFallback
            src={image_url}
            width={400}
            height={400}
            alt={title}
            className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-[1.08]"
            square
            priority={priority}
            sizes={sizes ?? "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"}
          />
        </div>
      </Link>

      {/* Título con link a PDP */}
      <h3 className="mt-2 text-sm font-semibold line-clamp-2 min-h-[2.5rem]">
        <Link
          href={href}
          prefetch={false}
          className="hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded"
        >
          {renderTitle()}
        </Link>
      </h3>

      {/* Precio - más destacado */}
      <div className="mt-2 text-primary-600 font-bold text-lg">
        {price !== null ? formatMXN(price) : <span className="text-gray-500 text-sm font-normal">Consultar precio</span>}
      </div>

      {/* Badges compactos: stock, envío gratis, puntos */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/* Estado de stock - Badge con acento de marca */}
        {in_stock !== null && in_stock !== undefined && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
              in_stock
                ? "bg-primary-50 text-primary-700 border border-primary-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {in_stock ? "En stock" : "Agotado"}
          </span>
        )}

        {/* Badge de envío gratis compacto */}
        {price !== null && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Envío gratis $2,000+
          </span>
        )}

        {/* Badge de puntos compacto */}
        {(() => {
          if (priceCents <= 0) return null;
          const points = estimatePointsForPriceCents(priceCents);
          if (points <= 0) return null;
          return (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              +{points.toLocaleString("es-MX")} pts
            </span>
          );
        })()}
      </div>

      {/* Controles: cantidad y agregar al carrito */}
      <div className="mt-auto pt-2 space-y-2">
        {canPurchase ? (
          <>
            <div className="flex items-center gap-2">
              <QuantityInput
                value={qty}
                onChange={handleQtyChange}
                min={1}
                max={99}
                disabled={isAdding}
                compact={compact}
                ariaLabel="Cantidad del producto"
              />
              {/* CTA Primario: Agregar al carrito o Elegir opciones */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding || !canPurchase}
                aria-busy={isAdding}
                aria-label={
                  needsSelections
                    ? `Elegir opciones para ${title}`
                    : `Agregar ${title} al carrito`
                }
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-all duration-200 font-semibold shadow-md ${
                  isAdding 
                    ? "scale-95 bg-primary-700" 
                    : "hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg"
                }`}
                title={needsSelections ? "Elegir opciones" : "Agregar al carrito"}
              >
                {needsSelections ? (
                  <>
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    <span>Elegir opciones</span>
                  </>
                ) : (
                  <>
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx={9} cy={21} r={1} />
                      <circle cx={20} cy={21} r={1} />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    <span>{isAdding ? "Agregado" : "Agregar"}</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600">
            {soldOut ? "Agotado" : "Consultar precio"}
          </div>
        )}

        {/* Acción alternativa: WhatsApp */}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackWhatsappClick({
                context: "pdp",
                productId: id,
                section,
                slug: product_slug,
                title,
              });
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            aria-label={`Consultar ${title} por WhatsApp`}
          >
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
                <span>¿Dudas? WhatsApp</span>
          </a>
        )}
      </div>
    </div>
  );
}

