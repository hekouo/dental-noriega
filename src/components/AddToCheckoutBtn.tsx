"use client";
import { useCheckoutStore } from "@/lib/store/checkoutStore";

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
  const upsertSingleToCheckout = useCheckoutStore(
    (s) => s.upsertSingleToCheckout,
  );

  const onClick = () => {
    upsertSingleToCheckout(
      {
        id: productId,
        title: productTitle,
        price: productPrice,
        qty,
        variantId: variantId || undefined,
        imageUrl,
      },
      true,
    );
  };

  return (
    <button type="button" className={className} onClick={onClick}>
      {children ?? "Añadir al checkout"}
    </button>
  );
}
