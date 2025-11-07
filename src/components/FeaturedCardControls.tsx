// src/components/FeaturedCardControls.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import type { SVGProps } from "react";
import { mxnFromCents } from "@/lib/utils/currency";
import { normalizePrice, hasPurchasablePrice } from "@/lib/catalog/model";
import { getWhatsAppHref } from "@/lib/whatsapp";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import { useCartStore } from "@/lib/store/cartStore";

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

type Props = {
  item: FeaturedItem;
  compact?: boolean;
};

type InteractiveProps = {
  item: FeaturedItem;
  compact: boolean;
  maxQty: number;
  waHref: string | null;
  addToCart: ReturnType<typeof useCartStore.getState>["addToCart"];
};

function scheduleIdle(cb: () => void) {
  if (typeof window === "undefined") return undefined;
  const win = window as typeof window & {
    requestIdleCallback?: (
      cb: IdleRequestCallback,
      opts?: IdleRequestOptions,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (win.requestIdleCallback) {
    const handle = win.requestIdleCallback(cb, { timeout: 500 });
    return () => win.cancelIdleCallback?.(handle);
  }

  const timeout = window.setTimeout(cb, 120);
  return () => window.clearTimeout(timeout);
}

function InteractiveControls({
  item,
  compact,
  maxQty,
  waHref,
  addToCart,
}: InteractiveProps) {
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const adjustQty = (next: number) => {
    setQty(Math.min(maxQty, Math.max(1, next)));
  };

  const onAdd = async () => {
    if (isAdding) return;
    try {
      setIsAdding(true);
      const price = mxnFromCents(normalizePrice(item.price_cents));
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

  const qtyInput = (
    <input
      aria-label="Cantidad"
      className={
        compact
          ? "w-10 text-center outline-none text-base"
          : "w-10 text-center outline-none"
      }
      inputMode="numeric"
      value={qty}
      onChange={(e) => {
        const v = parseInt(e.target.value.replace(/[^\d]/g, "") || "1", 10);
        adjustQty(v);
      }}
    />
  );

  if (!compact) {
    return (
      <>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border px-2 py-1">
            <button
              type="button"
              className="h-8 w-6 text-xl"
              aria-label="Disminuir cantidad"
              onClick={() => adjustQty(qty - 1)}
              disabled={isAdding || qty <= 1}
            >
              –
            </button>
            {qtyInput}
            <button
              type="button"
              className="h-8 w-6 text-xl"
              aria-label="Aumentar cantidad"
              onClick={() => adjustQty(qty + 1)}
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
            >
              Consultar por WhatsApp
            </a>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border h-9 px-3">
          <button
            type="button"
            className="h-9 w-6 text-base font-medium"
            aria-label="Disminuir cantidad"
            onClick={() => adjustQty(qty - 1)}
            disabled={isAdding || qty <= 1}
          >
            –
          </button>
          {qtyInput}
          <button
            type="button"
            className="h-9 w-6 text-base font-medium"
            aria-label="Aumentar cantidad"
            onClick={() => adjustQty(qty + 1)}
            disabled={isAdding || qty >= maxQty}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={onAdd}
          aria-busy={isAdding}
          className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-white hover:bg-black/90 disabled:opacity-60 h-9"
          disabled={isAdding}
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
        >
          Consultar por WhatsApp
        </a>
      )}
    </>
  );
}

export default function FeaturedCardControls({ item, compact = false }: Props) {
  const addToCart = useCartStore.getState().addToCart;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInteractive, setIsInteractive] = useState(false);

  const stockQty = normalizePrice(item.stock_qty);
  const canPurchase = hasPurchasablePrice(item);
  const maxQty = Math.min(99, Math.max(0, stockQty));

  const waHref = getWhatsAppHref(
    `Hola, me interesa el producto: ${item.title} (${item.product_slug}). ¿Lo tienes disponible?`,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !canPurchase) return;

    let cancelled = false;
    let stopIdle: (() => void) | undefined;
    let observer: IntersectionObserver | undefined;

    const markReady = () => {
      if (!cancelled) {
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
            stopIdle = scheduleIdle(markReady);
            observer?.disconnect();
          }
        },
        { rootMargin: "200px" },
      );
      observer.observe(node);
    } else {
      stopIdle = scheduleIdle(markReady);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      stopIdle?.();
    };
  }, [canPurchase]);

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

  if (!isInteractive) {
    if (!compact) {
      return (
        <div className="mt-auto pt-3 space-y-2" ref={containerRef}>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border px-2 py-1 opacity-70">
              <span className="h-8 w-6 text-xl flex items-center justify-center">
                –
              </span>
              <span className="w-10 text-center">1</span>
              <span className="h-8 w-6 text-xl flex items-center justify-center">
                +
              </span>
            </div>
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-xl bg-black/50 px-4 py-2 text-white opacity-60"
            >
              <ShoppingCartIcon className="h-4 w-4" />
              Agregar
            </button>
          </div>
          {waHref && (
            <div className="mt-2">
              <span className="text-sm text-muted-foreground underline underline-offset-2">
                Consultar por WhatsApp
              </span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mt-2 space-y-2" ref={containerRef}>
        <div className="flex items-center gap-3 opacity-70">
          <div className="flex items-center rounded-lg border h-9 px-3">
            <span className="h-9 w-6 text-base font-medium flex items-center justify-center">
              –
            </span>
            <span className="w-10 text-center text-base">1</span>
            <span className="h-9 w-6 text-base font-medium flex items-center justify-center">
              +
            </span>
          </div>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-xl bg-black/50 px-4 py-2 text-white opacity-60 h-9"
          >
            <ShoppingCartIcon className="h-4 w-4" />
            <span>Agregar</span>
          </button>
        </div>
        {waHref && (
          <span className="text-sm underline text-muted-foreground block">
            Consultar por WhatsApp
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={compact ? "mt-2 space-y-2" : "mt-auto pt-3 space-y-2"}
      ref={containerRef}
    >
      <InteractiveControls
        item={item}
        compact={compact}
        maxQty={maxQty}
        waHref={waHref}
        addToCart={addToCart}
      />
    </div>
  );
}
