"use client";
import { useCartStore } from "@/lib/store/cartStore";

type Props = {
  productId: string;
  productTitle: string;
  productPrice: number;
  qty?: number;
  variantId?: string | null;
  className?: string;
  children?: React.ReactNode;
};

export default function AddToCartBtn({
  productId,
  productTitle,
  productPrice,
  qty = 1,
  variantId,
  className,
  children,
}: Props) {
  // Selector PRIMITIVO: nada de objetos/arrays
  const addItem = useCartStore((s) => s.addItem);

  const onClick = () => {
    addItem({
      id: variantId ?? productId,
      title: productTitle,
      price: productPrice,
      qty,
    });
  };

  return (
    <button type="button" className={className} onClick={onClick}>
      {children ?? "Agregar al carrito"}
    </button>
  );
}
