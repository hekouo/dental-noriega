"use client";
import { useCartStore } from "@/lib/store/cartStore";

type Props = {
  productId: string;
  productTitle: string;
  productPrice: number;
  qty?: number;
  variantId?: string | null;
  imageUrl?: string;
  className?: string;
  children?: React.ReactNode;
};

export default function AddToCartBtn({
  productId,
  productTitle,
  productPrice,
  qty = 1,
  variantId,
  imageUrl,
  className,
  children,
}: Props) {
  // Selector PRIMITIVO: nada de objetos/arrays
  const addToCart = useCartStore((s) => s.addToCart);

  const onClick = () => {
    addToCart({
      id: productId,
      title: productTitle,
      price: productPrice,
      qty,
      variantId: variantId || undefined,
      imageUrl,
    });
  };

  return (
    <button type="button" className={className} onClick={onClick}>
      {children ?? "Agregar al carrito"}
    </button>
  );
}
