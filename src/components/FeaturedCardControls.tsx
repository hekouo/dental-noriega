// src/components/FeaturedCardControls.tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { mxnFromCents } from "@/lib/utils/currency";
import { normalizePrice, hasPurchasablePrice } from "@/lib/catalog/model";
import { getWhatsAppHref } from "@/lib/whatsapp";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import { useCartStore } from "@/lib/store/cartStore";

type Props = {
  item: FeaturedItem;
  compact?: boolean;
};

function scheduleIdle(cb: () => void) {
  if (typeof window === "undefined") return;
  const id =
    (
      window as typeof window & {
        requestIdleCallback?: typeof requestIdleCallback;
      }
    ).requestIdleCallback?.(() => cb(), { timeout: 500 }) ??
    window.setTimeout(cb, 120);
  return () => {
    if (
      (
        window as typeof window & {
          cancelIdleCallback?: typeof cancelIdleCallback;
        }
      ).cancelIdleCallback
    ) {
      (
        window as typeof window & {
          cancelIdleCallback?: typeof cancelIdleCallback;
        }
      ).cancelIdleCallback(id as number);
    } else {
      window.clearTimeout(id as number);
    }
  };
}

export default function FeaturedCardControls({ item, compact = false }: Props) {
  const addToCartRef = useRef(useCartStore.getState().addToCart);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInteractive, setIsInteractive] = useState(false);
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const priceCents = normalizePrice(item.price_cents);
  const stockQty = normalizePrice(item.stock_qty);
  const canPurchase = hasPurchasablePrice(item);
  const maxQty = Math.min(99, Math.max(0, stockQty));

  const waHref = getWhatsAppHref(
    `Hola, me interesa el producto: ${item.title} (${item.product_slug}). ¿Lo tienes disponible?`,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !canPurchase) return;

    let cleaned = false;
    let stopIdle: (() => void) | undefined;
    let observer: IntersectionObserver | undefined;

    const ready = () => {
      if (!cleaned) {
        stopIdle?.();
        setIsInteractive(true);
      }
    };

    const node = containerRef.current;

    if (node && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry?.isIntersecting) {
            stopIdle = scheduleIdle(ready);
            observer?.disconnect();
          }
        },
        { rootMargin: "200px" },
      );
      observer.observe(node);
    } else {
      stopIdle = scheduleIdle(ready);
    }

    return () => {
      cleaned = true;
      observer?.disconnect();
      stopIdle?.();
    };
  }, [canPurchase]);

  const onAdd = useCallback(async () => {
    if (isAdding || !isInteractive) return;
    try {
      setIsAdding(true);
      const price = mxnFromCents(priceCents);
      addToCartRef.current({
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
  }, [
    isAdding,
    isInteractive,
    item.image_url,
    item.product_id,
    item.title,
    priceCents,
    qty,
  ]);

  if (
    !canPurchase ||
    !item.price_cents ||
    item.price_cents <= 0 ||
    maxQty <= 0
  ) {
    return (
      <div className="mt-2" ref={containerRef}>
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

  const interactionDisabled = !isInteractive || isAdding;

  const adjustQty = (next: number) => {
    if (!isInteractive) return;
    setQty(Math.min(maxQty, Math.max(1, next)));
  };

  if (!compact) {
    return (
      <div className="mt-auto pt-3 space-y-2" ref={containerRef}>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border px-2 py-1">
            <button
              type="button"
              className="h-8 w-6 text-xl"
              aria-label="Disminuir cantidad"
              onClick={() => adjustQty(qty - 1)}
              disabled={interactionDisabled || qty <= 1}
            >
              –
            </button>
            <input
              aria-label="Cantidad"
              className="w-10 text-center outline-none"
              inputMode="numeric"
              value={qty}
              onChange={(e) => {
                if (!isInteractive) return;
                const v = parseInt(
                  e.target.value.replace(/[^\d]/g, "") || "1",
                  10,
                );
                adjustQty(v);
              }}
              readOnly={!isInteractive}
            />
            <button
              type="button"
              className="h-8 w-6 text-xl"
              aria-label="Aumentar cantidad"
              onClick={() => adjustQty(qty + 1)}
              disabled={interactionDisabled || qty >= maxQty}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onAdd}
            aria-busy={isAdding}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white hover:bg-black/90 disabled:opacity-60"
            disabled={interactionDisabled}
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

  return (
    <div className="mt-2 space-y-2" ref={containerRef}>
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border h-9 px-3">
          <button
            type="button"
            className="h-9 w-6 text-base font-medium"
            aria-label="Disminuir cantidad"
            onClick={() => adjustQty(qty - 1)}
            disabled={interactionDisabled || qty <= 1}
          >
            –
          </button>
          <input
            aria-label="Cantidad"
            className="w-10 text-center outline-none text-base"
            inputMode="numeric"
            value={qty}
            onChange={(e) => {
              if (!isInteractive) return;
              const v = parseInt(
                e.target.value.replace(/[^\d]/g, "") || "1",
                10,
              );
              adjustQty(v);
            }}
            readOnly={!isInteractive}
          />
          <button
            type="button"
            className="h-9 w-6 text-base font-medium"
            aria-label="Aumentar cantidad"
            onClick={() => adjustQty(qty + 1)}
            disabled={interactionDisabled || qty >= maxQty}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          aria-busy={isAdding}
          className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white hover:bg-black/90 disabled:opacity-60 h-9"
          disabled={interactionDisabled}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Agregar</span>
        </button>
      </div>

      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline text-muted-foreground block"
        >
          Consultar por WhatsApp
        </a>
      )}
    </div>
  );
}
