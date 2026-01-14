// src/components/FeaturedCardControls.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SVGProps } from "react";
import { mxnFromCents } from "@/lib/utils/currency";
import { normalizePrice, hasPurchasablePrice } from "@/lib/catalog/model";
import { getWhatsAppHref } from "@/lib/whatsapp";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";
import { useCartStore } from "@/lib/store/cartStore";
import QuantityInput from "@/components/cart/QuantityInput";
import { requiresSelections } from "@/components/product/usePdpAddToCartGuard";
import { useToast } from "@/components/ui/ToastProvider.client";
import { ROUTES } from "@/lib/routes";

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
  const router = useRouter();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const priceCents = normalizePrice(item.price_cents);
  const soldOut = !item.in_stock || !item.is_active;
  const canPurchase = hasPurchasablePrice(item) && !soldOut;
  const maxQty = canPurchase ? 99 : 0;
  
  // Verificar si el producto requiere selecciones obligatorias
  const needsSelections = requiresSelections({
    title: item.title,
    product_slug: item.product_slug,
  });

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
    
    // Si requiere selecciones, navegar al PDP en lugar de agregar
    if (needsSelections) {
      showToast({
        message: "Este producto requiere seleccionar opciones",
        variant: "info",
        durationMs: 2000,
      });
      router.push(ROUTES.product(item.section, item.product_slug));
      return;
    }
    
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
          {/* CTA Primario: Agregar al carrito o Elegir opciones */}
          <button
            type="button"
            onClick={onAdd}
            aria-busy={isAdding}
            aria-label={needsSelections ? "Elegir opciones" : "Agregar al carrito"}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 font-medium transition-colors"
            disabled={isAdding}
            title={needsSelections ? "Elegir opciones" : "Agregar al carrito"}
          >
            {needsSelections ? (
              <>
                <svg
                  className="h-4 w-4"
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
                Elegir opciones
              </>
            ) : (
              <>
                <ShoppingCartIcon className="h-4 w-4" />
                Agregar
              </>
            )}
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

        {/* CTA Primario: Agregar al carrito o Elegir opciones */}
        <button
          type="button"
          onClick={onAdd}
          aria-busy={isAdding}
          aria-label={needsSelections ? "Elegir opciones" : "Agregar al carrito"}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-60 h-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 font-medium transition-colors"
          disabled={isAdding}
          title={needsSelections ? "Elegir opciones" : "Agregar al carrito"}
        >
          {needsSelections ? (
            <>
              <svg
                className="h-4 w-4"
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
              <ShoppingCartIcon className="h-4 w-4" />
              <span>Agregar</span>
            </>
          )}
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
