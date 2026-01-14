"use client";

import { useEffect, useState, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import QtyStepper from "@/components/ui/QtyStepper";
import { useCartStore } from "@/lib/store/cartStore";
import { mxnFromCents } from "@/lib/utils/currency";
import { trackAddToCart } from "@/lib/analytics/events";
import { launchCartConfetti } from "@/lib/ui/confetti";

type StickyAddToCartBarProps = {
  product: {
    id: string;
    title: string;
    section: string;
    product_slug: string;
    price_cents: number;
    image_url?: string | null;
    in_stock?: boolean | null;
    is_active?: boolean | null;
  };
  anchorSelector?: string;
};

/**
 * Barra sticky de agregar al carrito para PDP móvil
 * Se muestra cuando el bloque original de add-to-cart sale del viewport
 * Usa IntersectionObserver para detectar visibilidad del anchor
 * Feature flag: NEXT_PUBLIC_STICKY_ATC
 */
export default function StickyAddToCartBar({
  product,
  anchorSelector = '[data-sticky-atc-anchor]',
}: StickyAddToCartBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const busyRef = useRef(false);
  const addToCart = useCartStore((s) => s.addToCart);

  // Obtener el anchor element usando querySelector
  useEffect(() => {
    if (typeof window === "undefined") return;

    const anchor = document.querySelector(anchorSelector) as HTMLElement;
    if (anchor) {
      anchorRef.current = anchor;
    }
  }, [anchorSelector]);

  // IntersectionObserver para detectar cuando el anchor sale del viewport
  useEffect(() => {
    // Fallback: si IntersectionObserver no existe, no mostrar sticky (silencioso)
    if (typeof window === "undefined" || !window.IntersectionObserver) {
      return;
    }

    const anchor = anchorRef.current;
    if (!anchor) {
      setIsVisible(false);
      return;
    }

    // Crear observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Si el anchor NO está visible (isIntersecting === false), mostrar sticky
        setIsVisible(!entry.isIntersecting);
      },
      {
        threshold: 0, // Trigger cuando cualquier parte sale del viewport
        rootMargin: "-100px 0px 0px 0px", // Pequeño margen superior para evitar flicker
      },
    );

    observerRef.current.observe(anchor);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [anchorSelector]);

  // Misma lógica básica de add-to-cart (sin validaciones de variantes/colores - simplificado)
  function handleAddToCart() {
    const soldOut = !product.in_stock || !product.is_active;
    const canBuy = !soldOut;

    if (!canBuy || busyRef.current) return;

    busyRef.current = true;
    setIsAdding(true);

    const price = mxnFromCents(product.price_cents);

    addToCart({
      id: product.id,
      title: product.title,
      price,
      qty,
      image_url: product.image_url ?? undefined,
      selected: true,
    });

    setTimeout(() => {
      busyRef.current = false;
      setIsAdding(false);
    }, 250);

    // Analytics
    trackAddToCart({
      productId: product.id,
      section: product.section,
      slug: product.product_slug,
      title: product.title,
      priceCents: product.price_cents,
      quantity: qty,
      source: "pdp",
    });

    // Confeti
    void launchCartConfetti();

    console.info("✅ Agregado al carrito:", product.title, "x", qty);
  }

  // No mostrar si no está visible o si no hay anchor
  if (!isVisible || !anchorRef.current) {
    return null;
  }

  const soldOut = !product.in_stock || !product.is_active;
  const canBuy = !soldOut;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Precio */}
        <div className="flex-shrink-0 text-lg font-bold text-primary-600">
          {new Intl.NumberFormat("es-MX", {
            style: "currency",
            currency: "MXN",
            maximumFractionDigits: 0,
          }).format(product.price_cents / 100)}
        </div>

        {/* Stepper de cantidad */}
        <QtyStepper
          value={qty}
          onValueChange={setQty}
          min={1}
          max={99}
          disabled={!canBuy || isAdding}
          className="flex-shrink-0"
        />

        {/* Botón agregar */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canBuy || isAdding}
          aria-busy={isAdding}
          aria-label={`Agregar ${product.title} al carrito`}
          className={`flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold min-h-[44px] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
            prefersReducedMotion ? "" : "active:scale-95"
          }`}
        >
          {isAdding ? "Agregando..." : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}
