// src/components/pdp/AddToCartControls.tsx
"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
    in_stock?: boolean;
    is_active?: boolean;
  };
};

export default function AddToCartControls({ product }: Props) {
  const router = useRouter();
  const addToCart = useCartStore((s) => s.addToCart);
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const busyRef = useRef(false);
  const soldOut = !product.in_stock || !product.is_active;
  const canBuy = !soldOut;

  function onAdd() {
    if (busyRef.current || !canBuy) return;
    busyRef.current = true;
    setIsAdding(true);
    
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      qty,
      image_url: product.image_url,
      selected: true,
    });

    // Analytics: add_to_cart
    if (typeof window !== "undefined" && window.dataLayer) {
      window.dataLayer.push({
        event: "add_to_cart",
        ecommerce: {
          currency: "MXN",
          value: product.price * qty,
          items: [
            {
              item_id: product.id,
              item_name: product.title,
              price: product.price,
              quantity: qty,
            },
          ],
        },
      });
    }

    setTimeout(() => {
      busyRef.current = false;
      setIsAdding(false);
    }, 250);
    
    console.info("✅ Agregado al carrito:", product.slug, "x", qty);
  }

  function onBuyNow() {
    if (busyRef.current || !canBuy) return;
    
    // Agregar al carrito primero
    onAdd();
    
    // Redirigir al checkout después de un pequeño delay para asegurar que el carrito se actualizó
    setTimeout(() => {
      router.push("/checkout/datos");
    }, 100);
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-4">
        <QtyStepper
          value={qty}
          onValueChange={setQty}
          min={1}
          max={99}
          disabled={!canBuy || isAdding}
        />
        {/* CTA Primario: Agregar al carrito */}
        <button
          type="button"
          onClick={onAdd}
          disabled={!canBuy || isAdding}
          aria-busy={isAdding}
          aria-label={`Agregar ${product.title} al carrito`}
          className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-colors font-semibold"
        >
          {isAdding ? "Agregando..." : "Agregar al carrito"}
        </button>
      </div>
      {/* CTA Secundario: Comprar ahora */}
      <button
        type="button"
        onClick={onBuyNow}
        disabled={!canBuy || isAdding}
        aria-busy={isAdding}
        aria-label={`Comprar ${product.title} ahora`}
        className="w-full px-4 py-2 rounded-lg border-2 border-primary-600 text-primary-600 bg-white hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-colors font-medium"
      >
        Comprar ahora
      </button>
    </div>
  );
}
