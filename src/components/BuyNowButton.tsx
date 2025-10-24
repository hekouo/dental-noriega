"use client";
import { useRouter } from "next/navigation";
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

export default function BuyNowButton({
  productId,
  productTitle,
  productPrice,
  qty = 1,
  variantId,
  className,
  children,
}: Props) {
  const router = useRouter();
  // Solo funciones, lectura primitiva
  const setCheckoutMode = useCartStore((s) => s.setCheckoutMode);
  const setOverrideItems = useCartStore((s) => s.setOverrideItems);

  const onClick = () => {
    setOverrideItems([
      {
        id: variantId ?? productId,
        title: productTitle,
        price: productPrice,
        qty,
      },
    ]);
    setCheckoutMode("buy-now");
    router.push("/checkout");
  };

  return (
    <button type="button" className={className} onClick={onClick}>
      {children ?? "Comprar ahora"}
    </button>
  );
}
