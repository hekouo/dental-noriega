// src/components/CatalogCardControls.tsx
"use client";
import { useState, useRef } from "react";
import type { SVGProps } from "react";
import QuantityInput from "@/components/cart/QuantityInput";
import { useCartStore } from "@/lib/store/cartStore";
import { mxnFromCents } from "@/lib/utils/currency";
import type { CatalogItem } from "@/lib/supabase/catalog";

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
  item: CatalogItem;
};

export default function CatalogCardControls({ item }: Props) {
  const addToCart = useCartStore((s) => s.addToCart);
  const [qty, setQty] = useState(1);
  const busyRef = useRef(false);
  const canBuy = item.in_stock !== false;

  function onAdd() {
    if (!canBuy || busyRef.current) return;
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
        <button
          onClick={onAdd}
          disabled={!canBuy}
          aria-label="Agregar al carrito"
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-black text-white disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          title="Agregar al carrito"
        >
          <ShoppingCartIcon className="h-4 w-4" />
          <span>Agregar</span>
        </button>
      </div>
    </div>
  );
}
