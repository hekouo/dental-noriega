// src/components/pdp/AddToCartControls.tsx
"use client";
import { useRef, useState } from "react";
import QtyStepper from "@/components/ui/QtyStepper";
import { useCartStore } from "@/lib/store/cartStore";

type Props = {
  product: {
    id: string;
    title: string;
    price: number;
    image_url?: string;
    section: string;
    slug: string;
    inStock?: boolean;
  };
};

export default function AddToCartControls({ product }: Props) {
  const addToCart = useCartStore((s) => s.addToCart);
  const [qty, setQty] = useState(1);
  const busyRef = useRef(false);
  const canBuy = product.inStock !== false;

  function onAdd() {
    if (busyRef.current || !canBuy) return;
    busyRef.current = true;
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      qty,
      image_url: product.image_url,
      selected: true,
    });
    setTimeout(() => (busyRef.current = false), 250);
    console.info("✅ Agregado al carrito:", product.slug, "x", qty);
  }

  function onBuyNow() {
    onAdd();
    location.href = "/checkout";
  }

  return (
    <div className="mt-6 flex items-center gap-4">
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
        className="px-4 py-2 rounded-lg bg-black text-white disabled:opacity-50"
      >
        Agregar al carrito
      </button>
      <button
        onClick={onBuyNow}
        disabled={!canBuy}
        className="px-4 py-2 rounded-lg border border-black disabled:opacity-50"
      >
        Comprar ahora
      </button>
    </div>
  );
}
