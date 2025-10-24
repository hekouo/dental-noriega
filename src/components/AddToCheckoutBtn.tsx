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

export default function AddToCheckoutBtn({
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
  const upsertCheckoutFromCart = useCartStore((s) => s.upsertCheckoutFromCart);

  const onClick = () => {
    upsertCheckoutFromCart({
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
      {children ?? "Añadir al checkout"}
    </button>
  );
}
