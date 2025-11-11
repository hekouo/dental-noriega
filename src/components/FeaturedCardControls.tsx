// src/components/FeaturedCardControls.tsx
"use client";
import { useState } from "react";
import type { SVGProps } from "react";
import { mxnFromCents } from "@/lib/utils/currency";
import { normalizePrice, hasPurchasablePrice } from "@/lib/catalog/model";
import { getWhatsAppHref } from "@/lib/whatsapp";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import { useCartStore } from "@/lib/store/cartStore";
import QuantityInput from "@/components/cart/QuantityInput";

type Props = {
  item: FeaturedItem;
  compact?: boolean;
};

type AddToCartFn = ReturnType<typeof useCartStore.getState>["addToCart"];

const ShoppingCartIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx={9} cy={21} r={1} />
    <circle cx={20} cy={21} r={1} />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

function useAddToCart(): AddToCartFn {
  return useCartStore((state) => state.addToCart);
}

export default function FeaturedCardControls({ item, compact = false }: Props) {
  const addToCart = useAddToCart();
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const priceCents = normalizePrice(item.price_cents);
  const soldOut = !item.in_stock || !item.is_active;
  const canPurchase = hasPurchasablePrice(item) && !soldOut;
  const maxQty = canPurchase ? 99 : 0;

  const waHref = getWhatsAppHref(
    `Hola, me interesa el producto: ${item.title} (${item.product_slug}). ¿Lo tienes disponible?`,
  );

  if (soldOut) {
    return (
      <div className="mt-2">
        <p className="text-sm text-muted-foreground">Agotado</p>
        {waHref && (
          <div className="mt-1">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline text-muted-foreground"
            >
              Consultar por WhatsApp
            </a>
          </div>
        )}
      </div>
    );
  }

  if (!item.price_cents || item.price_cents <= 0) {
    return (
      <div className="mt-2">
        <p className="text-sm text-muted-foreground">Consultar precio</p>
        {waHref && (
          <div className="mt-1">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline text-muted-foreground"
            >
              Consultar por WhatsApp
            </a>
          </div>
        )}
      </div>
    );
  }

  const onAdd = async () => {
    if (isAdding) return;
    try {
      setIsAdding(true);
      const price = mxnFromCents(priceCents);
      addToCart({
        id: item.product_id,
        title: item.title,
        price,
        qty,
        image_url: item.image_url ?? undefined,
        selected: true,
      });

      if (typeof window !== "undefined" && window.dataLayer) {
        window.dataLayer.push({
          event: "add_to_cart",
          ecommerce: {
            currency: "MXN",
            value: price * qty,
            items: [
              {
                item_id: item.product_id,
                item_name: item.title,
                price,
                quantity: qty,
              },
            ],
          },
        });
      }
    } finally {
      setTimeout(() => setIsAdding(false), 250);
    }
  };

  const handleQtyChange = (next: number) => {
    setQty(Math.min(maxQty, Math.max(1, next)));
  };

  if (!compact) {
    return (
      <div className="mt-auto pt-3 space-y-2">
        <div className="flex items-center gap-3">
          <QuantityInput
            value={qty}
            onChange={handleQtyChange}
            min={1}
            max={maxQty}
            disabled={isAdding}
            ariaLabel="Cantidad"
          />
          <button
            type="button"
            onClick={onAdd}
            aria-busy={isAdding}
            aria-label="Agregar al carrito"
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white hover:bg-black/90 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            disabled={isAdding}
            title="Agregar al carrito"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            Agregar
          </button>
        </div>
        {waHref && (
          <div className="mt-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm underline text-muted-foreground"
              aria-label="Consultar por WhatsApp"
            >
              Consultar por WhatsApp
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-3">
        <QuantityInput
          value={qty}
          onChange={handleQtyChange}
          min={1}
          max={maxQty}
          disabled={isAdding}
          compact
          ariaLabel="Cantidad"
        />

        <button
          type="button"
          onClick={onAdd}
          aria-busy={isAdding}
          aria-label="Agregar al carrito"
          className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white hover:bg-black/90 disabled:opacity-60 h-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          disabled={isAdding}
          title="Agregar al carrito"
        >
          <ShoppingCartIcon className="h-4 w-4" />
          <span>Agregar</span>
        </button>
      </div>

      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline text-muted-foreground block"
          aria-label="Consultar por WhatsApp"
        >
          Consultar por WhatsApp
        </a>
      )}
    </div>
  );
}
