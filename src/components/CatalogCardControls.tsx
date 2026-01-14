// src/components/CatalogCardControls.tsx
"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import QuantityInput from "@/components/cart/QuantityInput";
import { useCartStore } from "@/lib/store/cartStore";
import { mxnFromCents } from "@/lib/utils/currency";
import { requiresSelections } from "@/components/product/usePdpAddToCartGuard";
import { useToast } from "@/components/ui/ToastProvider.client";
import { ROUTES } from "@/lib/routes";
// ShoppingCart icon replaced with inline SVG to reduce bundle size
import type { CatalogItem } from "@/lib/catalog/model";

type Props = {
  item: CatalogItem;
};

export default function CatalogCardControls({ item }: Props) {
  const addToCart = useCartStore((s) => s.addToCart);
  const router = useRouter();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const busyRef = useRef(false);
  // Lógica correcta: soldOut = !item.in_stock || !item.is_active
  const soldOut = !item.in_stock || !item.is_active;
  const canBuy = !soldOut;
  
  // Verificar si el producto requiere selecciones obligatorias
  const needsSelections = requiresSelections({
    title: item.title,
    product_slug: item.product_slug,
  });

  function onAdd() {
    if (!canBuy || busyRef.current || !item.price_cents) return;
    
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
    
    busyRef.current = true;
    addToCart({
      id: item.id,
      title: item.title,
      price: mxnFromCents(item.price_cents),
      qty,
      image_url: item.image_url ?? undefined,
      selected: true,
    });
    setTimeout(() => (busyRef.current = false), 250);
    console.info("✅ Agregado al carrito:", item.title, "x", qty);

    // Analítica: add_to_cart
    if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({
        event: "add_to_cart",
        ecommerce: {
          currency: "MXN",
          value: mxnFromCents(item.price_cents) * qty,
          items: [
            {
              item_id: item.id,
              item_name: item.title,
              price: mxnFromCents(item.price_cents),
              quantity: qty,
            },
          ],
        },
      });
    }
  }

  return (
    <div className="mt-auto pt-2 space-y-2">
      <div className="flex items-center gap-2">
        <QuantityInput
          value={qty}
          onChange={setQty}
          min={1}
          max={999}
          disabled={!canBuy}
          compact
          ariaLabel="Cantidad"
        />
        {/* CTA Primario: Agregar al carrito o Elegir opciones */}
        <button
          onClick={onAdd}
          disabled={!canBuy}
          aria-label={needsSelections ? "Elegir opciones" : "Agregar al carrito"}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 font-medium transition-colors"
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
              <span>Agregar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
