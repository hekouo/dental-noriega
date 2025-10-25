// src/components/FeaturedCard.tsx
"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import QtyStepper from "@/components/ui/QtyStepper";
import { useCartStore } from "@/lib/store/cartStore";
import { formatCurrency } from "@/lib/utils/currency";

type Props = {
  item: {
    canonicalUrl?: string;
    title: string;
    price?: number; // centavos
    imageUrl?: string;
    inStock: boolean;
    badge?: string;
  };
};

export default function FeaturedCard({ item }: Props) {
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

  const href =
    item.canonicalUrl || `/catalogo?query=${encodeURIComponent(item.title)}`;

  return (
    <div className="border rounded-xl overflow-hidden flex flex-col">
      <Link
        href={href}
        onMouseEnter={() => {
          if (item.canonicalUrl) {
            fetch(item.canonicalUrl, { cache: "force-cache" }).catch(() => {});
          }
        }}
        className="block"
      >
        <div className="aspect-square bg-gray-50">
          <ImageWithFallback
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      </Link>

      <div className="p-3 flex-1 flex flex-col">
        <div className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">
          {item.title}
        </div>
        <div className="mt-1 text-sm text-gray-700">
          {typeof item.price === "number" ? formatCurrency(item.price) : "—"}
        </div>
        {item.badge ? (
          <div className="mt-1 text-[11px] inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700">
            {item.badge}
          </div>
        ) : null}

        <div className="mt-auto pt-3 flex items-center gap-3">
          <QtyStepper value={qty} min={1} max={99} onChange={setQty} />
          <button
            onClick={onAdd}
            disabled={!canBuy}
            className="px-3 py-2 rounded-lg text-sm bg-black text-white disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
