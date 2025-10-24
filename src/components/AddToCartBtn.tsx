"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";

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
  const addItem = useCartStore((state) => state.addItem);
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
        "px-4 py-2 rounded-lg border flex items-center gap-2 disabled:opacity-60"
      }
      aria-label="Agregar al carrito"
    >
      <ShoppingCart size={18} />
      <span>{isAdding ? "¡Agregado!" : "Agregar al carrito"}</span>
    </button>
  );
}
