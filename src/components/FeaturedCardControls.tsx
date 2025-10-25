// src/components/FeaturedCardControls.tsx
"use client";
import { useRef, useState } from "react";
import QtyStepper from "@/components/ui/QtyStepper";
import { useCartStore } from "@/lib/store/cartStore";

type Props = {
  item: {
    canonicalUrl?: string;
    title: string;
    price?: number;
    imageUrl?: string;
    inStock: boolean;
    badge?: string;
  };
};

export default function FeaturedCardControls({ item }: Props) {
  const addToCart = useCartStore((s) => s.addToCart);
  const [qty, setQty] = useState(1);
  const busyRef = useRef(false);
  const canBuy = item.inStock !== false && typeof item.price === "number";

  function onAdd() {
    if (!canBuy || busyRef.current) return;
    busyRef.current = true;
    addToCart({
      id: item.canonicalUrl || item.title,
      title: item.title,
      price: item.price!,
      qty,
      imageUrl: item.imageUrl,
      selected: true,
    });
    setTimeout(() => (busyRef.current = false), 250);
    console.info("✅ Agregado al carrito:", item.title, "x", qty);
  }

  return (
    <div className="mt-auto pt-3 flex items-center gap-3">
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
  );
}
