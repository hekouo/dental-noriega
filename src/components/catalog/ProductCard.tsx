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
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const busyRef = useRef(false);

  // Normalizar precio
  const priceCents = normalizePrice(price_cents);
  const price = priceCents > 0 ? mxnFromCents(priceCents) : null;

  // Estado de disponibilidad
  const soldOut = !in_stock || !is_active;
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

  // Handler para agregar al carrito
  const handleAddToCart = () => {
    if (!canPurchase || busyRef.current || !price) return;
    
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
    if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({
        event: "add_to_cart",
        ecommerce: {
          currency: "MXN",
          value: price * qty,
          items: [
            {
              item_id: id,
              item_name: title,
              price,
              quantity: qty,
            },
          ],
        },
      });
    }

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
    <div className="rounded-2xl border p-3 flex flex-col bg-white hover:shadow-md transition-shadow">
      {/* Imagen con link a PDP */}
      <Link href={href} prefetch={false} className="block">
        <div className="relative w-full aspect-square bg-white rounded-lg overflow-hidden">
          <ImageWithFallback
            src={image_url}
            width={400}
            height={400}
            alt={title}
            className="w-full h-full object-contain"
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

      {/* Precio */}
      <div className="mt-1 text-blue-600 font-bold">
        {price !== null ? formatMXN(price) : "Consultar precio"}
      </div>

      {/* Estado de stock */}
      {soldOut && (
        <span className="mt-1 inline-block rounded bg-red-100 px-2 py-0.5 text-[11px] text-red-700">
          Agotado
        </span>
      )}

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
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding || !canPurchase}
                aria-busy={isAdding}
                aria-label={`Agregar ${title} al carrito`}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-black text-white hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-colors"
                title="Agregar al carrito"
              >
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
              </button>
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600">
            {soldOut ? "Agotado" : "Consultar precio"}
          </div>
        )}

        {/* Botón WhatsApp para consultas - SIEMPRE visible si hay link */}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm underline text-muted-foreground hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded"
            aria-label={`Consultar ${title} por WhatsApp`}
          >
            Consultar por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

