"use client";
import { useRouter } from "next/navigation";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { useEffect } from "react";

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

export default function BuyNowButton({
  productId,
  productTitle,
  productPrice,
  qty = 1,
  variantId,
  image_url,
  className,
  children,
}: Props) {
  const router = useRouter();
  const upsert = useCheckoutStore((s) => s.upsertSingleToCheckout);

  // Prefetch checkout pages for faster navigation
  useEffect(() => {
    router.prefetch("/checkout/pago");
  }, [router]);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        upsert({
          id: productId,
          title: productTitle,
          price: productPrice,
          qty: qty ?? 1,
          variantId: variantId || undefined,
          image_url,
        });
        router.push("/checkout/pago");
      }}
    >
      {children ?? "Comprar ahora"}
    </button>
  );
}
