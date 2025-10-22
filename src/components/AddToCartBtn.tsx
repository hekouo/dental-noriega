"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { useState } from "react";

type Props = {
  product: {
    title: string;
    price: number;
    image?: string;
    imageResolved?: string;
    slug: string;
  };
  sectionSlug: string;
  qty?: number;
  className?: string;
};

export function AddToCartBtn({
  product,
  sectionSlug,
  qty = 1,
  className,
}: Props) {
  const { add } = useCart();
  const [isAdding, setIsAdding] = useState(false);

  const handleClick = () => {
    setIsAdding(true);
    add({
      id: `${sectionSlug}/${product.slug}`,
      title: product.title,
      price: product.price,
      image: product.image,
      imageResolved: product.imageResolved,
      qty,
      sectionSlug,
      slug: product.slug,
    });
    setTimeout(() => setIsAdding(false), 1000);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isAdding}
      className={
        className ||
        "btn btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
      }
    >
      <ShoppingCart size={18} />
      <span>{isAdding ? "¡Agregado!" : "Agregar al carrito"}</span>
    </button>
  );
}
