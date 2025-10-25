// src/components/pdp/ProductDetailPage.tsx
"use client";
import { useRef, useState } from "react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import QtyStepper from "@/components/ui/QtyStepper";
import { useCartStore } from "@/lib/store/cartStore";
import { formatCurrency } from "@/lib/utils/currency";

type Props = {
  product: {
    section: string;
    slug: string;
    title: string;
    price: number; // centavos
    imageUrl?: string;
    inStock?: boolean;
    sku?: string;
    description?: string;
  };
};

export default function ProductDetailPage({ product }: Props) {
  const addToCart = useCartStore((s) => s.addToCart);
  const [qty, setQty] = useState<number>(1);
  const busyRef = useRef(false);
  const canBuy = product.inStock !== false;

  function onAdd() {
    if (busyRef.current || !canBuy) return;
    busyRef.current = true;
    addToCart({
      id: product.sku ?? product.slug,
      title: product.title,
      price: product.price,
      qty,
      imageUrl: product.imageUrl,
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
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
      <div className="w-full">
        <div className="aspect-square rounded-lg overflow-hidden bg-gray-50">
          <ImageWithFallback
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">{product.title}</h1>
        <div className="text-xl mt-2">{formatCurrency(product.price)}</div>
        {product.inStock === false ? (
          <div className="mt-2 text-sm text-red-600">Agotado</div>
        ) : (
          <div className="mt-2 text-sm text-green-600">Disponible</div>
        )}
        {product.description ? (
          <p className="mt-4 text-sm text-gray-700">{product.description}</p>
        ) : null}

        <div className="mt-6 flex items-center gap-4">
          <QtyStepper value={qty} min={1} max={99} onChange={setQty} />
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
      </div>
    </div>
  );
}
