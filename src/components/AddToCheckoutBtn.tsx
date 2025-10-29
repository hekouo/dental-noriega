"use client";
import { useCheckoutStore } from "@/lib/store/checkoutStore";

type Props = {
  productId: string;
  productTitle: string;
  productPrice: number;
  qty?: number;
  variantId?: string | null;
  image_url?: string;
  className?: string;
  children?: React.ReactNode;
};

export default function AddToCheckoutBtn({
  productId,
  productTitle,
  productPrice,
  qty = 1,
  variantId,
  image_url,
  className,
  children,
}: Props) {
  // Selector PRIMITIVO: nada de objetos/arrays
  const upsertSingleToCheckout = useCheckoutStore(
    (s) => s.upsertSingleToCheckout,
  );

  const onClick = () => {
    upsertSingleToCheckout({
      id: productId,
      title: productTitle,
      price: productPrice,
      qty,
      variantId: variantId || undefined,
      image_url,
    });
  };

  return (
    <button type="button" className={className} onClick={onClick}>
      {children ?? "Añadir al checkout"}
    </button>
  );
}
