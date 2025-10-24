"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCartStore, selectOps } from "@/lib/store/cartStore";

type Props = {
  product: {
    id?: string;
    title: string;
    price: number; // en pesos
    image?: string;
    imageResolved?: string;
    slug: string;
    code?: string;
  };
  sectionSlug?: string;
  qty?: number; // opcional, default 1
  className?: string;
};

export function AddToCartBtn({
  product,
  sectionSlug = "general",
  qty = 1,
  className,
}: Props) {
  const { addItem } = useCartStore(selectOps);
  const [isAdding, setIsAdding] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // por si el botón vive dentro de un <Link> o <form>
    e.stopPropagation();

    if (isAdding) return; // evita dobles clics
    setIsAdding(true);

    const price = Number.isFinite(product.price) ? Number(product.price) : 0;
    const quantity = Math.max(1, Math.floor(qty || 1));

    addItem({
      id: product.id || `${sectionSlug}/${product.slug}`,
      title: product.title,
      price, // pesos
      qty: quantity,
      image: product.image,
      code: product.code,
      slug: product.slug,
    });

    // feedback rápido
    const t = setTimeout(() => setIsAdding(false), 900);
    // cleanup si el componente se desmonta antes
    return () => clearTimeout(t);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isAdding}
      className={
        className ??
        [
          "relative inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold gap-2",
          "text-neutral-900 bg-gradient-to-b from-white to-neutral-200",
          "shadow-[inset_0_2px_6px_rgba(255,255,255,0.9),0_6px_14px_rgba(0,0,0,0.20)]",
          "ring-1 ring-inset ring-neutral-300",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-400",
          "active:translate-y-[2px] active:shadow-[inset_0_1px_3px_rgba(255,255,255,0.8),0_4px_10px_rgba(0,0,0,0.18)]",
          "transition-transform disabled:opacity-60",
        ].join(" ")
      }
      aria-label="Agregar al carrito"
    >
      <ShoppingCart size={18} />
      <span>{isAdding ? "¡Agregado!" : "Agregar al carrito"}</span>
    </button>
  );
}
