"use client";
import { useRouter } from "next/navigation";
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

export default function BuyNowButton({
  productId,
  productTitle,
  productPrice,
  qty = 1,
  variantId,
  imageUrl,
  className,
  children,
}: Props) {
  const push = useRouter().push;
  const upsert = useCheckoutStore((s) => s.upsertSingleToCheckout);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        upsert(
          {
            id: productId,
            title: productTitle,
            price: productPrice,
            qty: qty ?? 1,
            variantId: variantId || undefined,
            imageUrl,
          },
          true,
        );
        push("/checkout/pago");
      }}
    >
      {children ?? "Comprar ahora"}
    </button>
  );
}
