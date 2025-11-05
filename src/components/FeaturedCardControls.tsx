// src/components/FeaturedCardControls.tsx
"use client";
import { useRef, useState } from "react";
import QtyStepper from "@/components/ui/QtyStepper";
import { useCartStore } from "@/lib/store/cartStore";
import { mxnFromCents, formatMXN } from "@/lib/utils/currency";
import type { FeaturedItem } from "@/lib/catalog/getFeatured.server";

type Props = {
  item: FeaturedItem;
};

export default function FeaturedCardControls({ item }: Props) {
  const addToCart = useCartStore((s) => s.addToCart);
  const [qty, setQty] = useState(1);
  const busyRef = useRef(false);
  const priceCents = item.price_cents ?? 0;
  const canBuy = item.stock_qty !== null ? item.stock_qty > 0 : true;

  function onAdd() {
    if (!canBuy || busyRef.current || priceCents === 0) return;
    busyRef.current = true;
    const price = mxnFromCents(priceCents);
    addToCart({
      id: item.product_id,
      title: item.title,
      price,
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
  }

  const priceStr = priceCents > 0 ? formatMXN(mxnFromCents(priceCents)) : "—";
  const msg = `Hola, me interesa: ${item.title} (${item.section}). Cantidad: ${qty}. Precio: ${priceStr}`;
  const wa = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;

  return (
    <div className="mt-auto pt-3 space-y-2">
      <div className="flex items-center gap-3">
        <QtyStepper
          value={qty}
          onValueChange={setQty}
          min={1}
          max={99}
          disabled={!canBuy}
        />
        <button
          onClick={onAdd}
          disabled={!canBuy}
          className="px-3 py-2 rounded-lg text-sm bg-black text-white disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-xs text-green-600 hover:text-green-700 underline"
      >
        Consultar por WhatsApp
      </a>
    </div>
  );
}
