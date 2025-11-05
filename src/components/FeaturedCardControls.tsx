// src/components/FeaturedCardControls.tsx
"use client";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";
import { mxnFromCents, formatMXN } from "@/lib/utils/currency";
import { normalizePrice, hasPurchasablePrice } from "@/lib/catalog/model";
import { getWhatsAppHref } from "@/lib/whatsapp";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

type Props = {
  item: FeaturedItem;
  compact?: boolean;
};

export default function FeaturedCardControls({ item, compact = false }: Props) {
  const addToCart = useCartStore((s) => s.addToCart);
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const priceCents = normalizePrice(item.price_cents);
  const stockQty = normalizePrice(item.stock_qty);
  const canPurchase = hasPurchasablePrice(item);
  const maxQty = Math.min(99, Math.max(0, stockQty));

  const waHref = getWhatsAppHref(
    `Hola, me interesa el producto: ${item.title} (${item.product_slug}). ¿Lo tienes disponible?`,
  );

  if (
    !canPurchase ||
    !item.price_cents ||
    item.price_cents <= 0 ||
    maxQty <= 0
  ) {
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
      console.info("✅ Agregado al carrito:", item.title, "x", qty);

      // Analítica: add_to_cart
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

  if (!compact) {
    // Versión existente (no compacta)
    return (
      <div className="mt-auto pt-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border px-2 py-1">
            <button
              type="button"
              className="h-8 w-6 text-xl"
              aria-label="Disminuir cantidad"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={isAdding}
            >
              –
            </button>
            <input
              aria-label="Cantidad"
              className="w-10 text-center outline-none"
              inputMode="numeric"
              value={qty}
              onChange={(e) => {
                const v = parseInt(
                  e.target.value.replace(/[^\d]/g, "") || "1",
                  10,
                );
                setQty(Math.min(maxQty, Math.max(1, v)));
              }}
              disabled={isAdding}
            />
            <button
              type="button"
              className="h-8 w-6 text-xl"
              aria-label="Aumentar cantidad"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={isAdding}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onAdd}
            aria-busy={isAdding}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white hover:bg-black/90 disabled:opacity-60"
            disabled={isAdding}
          >
            <ShoppingCart className="h-4 w-4" />
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
            >
              Consultar por WhatsApp
            </a>
          </div>
        )}
      </div>
    );
  }

  // Versión compacta v2
  return (
    <div className="mt-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border px-2 py-1">
          <button
            type="button"
            className="h-8 w-6 text-xl"
            aria-label="Disminuir cantidad"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={isAdding || qty <= 1}
          >
            –
          </button>
          <input
            aria-label="Cantidad"
            className="w-10 text-center outline-none"
            inputMode="numeric"
            value={qty}
            onChange={(e) => {
              const v = parseInt(
                e.target.value.replace(/[^\d]/g, "") || "1",
                10,
              );
              setQty(Math.min(maxQty, Math.max(1, v)));
            }}
            disabled={isAdding}
          />
          <button
            type="button"
            className="h-8 w-6 text-xl"
            aria-label="Aumentar cantidad"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            disabled={isAdding || qty >= maxQty}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          aria-busy={isAdding}
          className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white hover:bg-black/90 disabled:opacity-60"
          disabled={isAdding}
        >
          <ShoppingCart className="h-4 w-4" />
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
          >
            Consultar por WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
