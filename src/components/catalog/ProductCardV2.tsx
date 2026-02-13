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
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { triggerHaptic } from "@/lib/ui/microAnims";
import type { ProductCardProps } from "@/components/catalog/ProductCard";

/**
 * ProductCardV2: look premium (menos ruido).
 * Props compatibles con ProductCard. Solo UI diferente.
 * Usado opt-in en /buscar vía SearchResultCard.
 */
export default function ProductCardV2({
  id,
  section,
  product_slug,
  title,
  price_cents,
  image_url,
  in_stock,
  is_active,
  description: _description,
  priority = false,
  sizes,
  variant = "default",
  highlightQuery,
}: ProductCardProps) {
  const isCompact = variant === "compact";
  const addToCart = useCartStore((s) => s.addToCart);
  const { showToast } = useToast();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const busyRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const microAnimsEnabled = process.env.NEXT_PUBLIC_MOBILE_MICRO_ANIMS === "true";

  const needsSelections = requiresSelections({ title, product_slug });
  const priceCents = normalizePrice(price_cents);
  const price = priceCents > 0 ? mxnFromCents(priceCents) : null;
  const soldOut = in_stock === false || is_active === false;
  const canPurchase = hasPurchasablePrice({
    price_cents,
    in_stock,
    is_active,
  });

  const href = `/catalogo/${section}/${product_slug}`;
  const waHref = getWhatsAppHref(
    `Hola, me interesa el producto: ${title} (${product_slug}). ¿Lo tienes disponible?`,
  );

  const handleAddToCart = () => {
    if (!canPurchase || busyRef.current || !price) return;
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
    trackAddToCart({
      productId: id,
      section,
      slug: product_slug,
      title,
      priceCents: priceCents > 0 ? priceCents : null,
      quantity: qty,
      source: "card",
    });
    void launchCartConfetti();
    if (!prefersReducedMotion && microAnimsEnabled) {
      triggerHaptic(10);
    }
    showToast({
      message: "Agregado al carrito",
      variant: "success",
      actionLabel: "Ver carrito",
      actionHref: ROUTES.carrito(),
      durationMs: microAnimsEnabled ? 3000 : 1400,
    });
    setTimeout(() => {
      busyRef.current = false;
      setIsAdding(false);
    }, 250);
  };

  const handleQtyChange = (next: number) => {
    setQty(Math.min(99, Math.max(1, next)));
  };

  const renderTitle = () => {
    if (!highlightQuery || !title) return <>{title}</>;
    const escaped = highlightQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = title.split(regex);
    return (
      <>
        {parts.map((part, i) => {
          const matches = regex.test(part);
          regex.lastIndex = 0;
          return matches ? <mark key={i}>{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>;
        })}
      </>
    );
  };

  // Fallback: datos mínimos para no romper
  if (!id || !section || !product_slug) {
    return null;
  }

  return (
    <div
      className="rounded-xl border border-stone-200/90 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden min-w-0 hover-lift tap-feedback flex flex-col"
      style={{
        animation: "fadeInUp 0.5s ease-out backwards",
        animationDelay: "var(--delay, 0ms)",
      }}
    >
      {/* Imagen: ratio 4/3; compact = menor altura */}
      <Link href={href} prefetch={false} className="block overflow-hidden">
        <div className={`relative w-full aspect-[4/3] bg-stone-50 dark:bg-gray-800 border-b border-stone-200/80 dark:border-gray-700 ${isCompact ? "max-h-[180px] sm:max-h-[210px]" : "max-h-[220px] sm:max-h-[260px]"}`}>
          <ImageWithFallback
            src={image_url}
            width={400}
            height={400}
            alt={title}
            className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.04]"
            square
            priority={priority}
            sizes={sizes ?? "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"}
          />
        </div>
      </Link>

      <div className={`flex flex-col flex-1 min-w-0 ${isCompact ? "p-3" : "p-3 sm:p-4"}`}>
        {/* Título line-clamp 2 */}
        <h3 className="text-sm font-semibold line-clamp-2 min-h-[2.5rem] text-gray-900 dark:text-gray-100">
          <Link
            href={href}
            prefetch={false}
            className="hover:text-primary-600 dark:hover:text-primary-400 focus-premium rounded"
          >
            {renderTitle()}
          </Link>
        </h3>

        {/* Precio claro */}
        <div className="mt-2 text-lg font-bold tracking-tight text-primary-600 dark:text-primary-400">
          {price !== null ? formatMXN(price) : <span className="text-stone-500 dark:text-gray-400 text-sm font-normal">Consultar precio</span>}
        </div>

        {/* Stock discreto + badges sutiles (stone/amber) */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {in_stock !== null && in_stock !== undefined && (
            <span className={in_stock ? "pill pill-stock" : "pill pill-stock-out"}>
              {in_stock ? "En stock" : "Agotado"}
            </span>
          )}
          {price !== null && (
            <span className="pill pill-shipping">Envío $2,000+</span>
          )}
          {priceCents > 0 && (() => {
            const points = estimatePointsForPriceCents(priceCents);
            if (points <= 0) return null;
            return (
              <span className="pill pill-points">+{points.toLocaleString("es-MX")} pts</span>
            );
          })()}
        </div>

        {/* Controles: tap targets >= 44px */}
        <div className={`mt-auto space-y-2 ${isCompact ? "pt-2" : "pt-4"}`}>
          {canPurchase ? (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex items-center gap-2">
                  <QuantityInput
                    value={qty}
                    onChange={handleQtyChange}
                    min={1}
                    max={99}
                    disabled={isAdding}
                    compact
                    ariaLabel="Cantidad del producto"
                  />
                </div>
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
                  className={`w-full sm:flex-1 flex items-center justify-center gap-2 min-h-[44px] px-3 py-2.5 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus-premium tap-feedback transition-all duration-200 font-semibold ${
                    isAdding ? "scale-95" : ""
                  }`}
                  title={needsSelections ? "Elegir opciones" : "Agregar al carrito"}
                >
                  {needsSelections ? (
                    <span>Elegir opciones</span>
                  ) : (
                    <span>{isAdding ? "Agregado" : "Agregar"}</span>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="text-sm text-stone-500 dark:text-gray-400">
              {soldOut ? "Agotado" : "Consultar precio"}
            </div>
          )}

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
              className={`flex items-center justify-center gap-1.5 font-medium focus-premium tap-feedback rounded-lg text-sm transition-colors min-h-[44px] ${isCompact ? "px-3 py-2 border border-stone-200 dark:border-gray-600 text-stone-600 dark:text-gray-400 hover:bg-stone-50 dark:hover:bg-gray-700/50" : "w-full px-3 py-2.5 bg-emerald-500 text-white hover:bg-emerald-600"}`}
              aria-label={`Consultar ${title} por WhatsApp`}
            >
              <span>¿Dudas? WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
