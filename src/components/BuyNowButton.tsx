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
  const router = useRouter();
  // Solo funciones, lectura primitiva
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
    router.push("/checkout/pago");
  };

  return (
    <button type="button" className={className} onClick={onClick}>
      {children ?? "Comprar ahora"}
    </button>
  );
}
