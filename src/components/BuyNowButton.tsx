"use client";
import { useRouter } from "next/navigation";
import { useCartStore, selectCartOps } from "@/lib/store/cartStore";

type Props = {
  product: {
    id?: string;
    title: string;
    price: number;
    image?: string;
    imageResolved?: string;
    slug: string;
    code?: string;
  };
  sectionSlug: string;
  qty: number;
};

export default function BuyNowButton({ product, sectionSlug, qty }: Props) {
  const { setCheckoutMode, setOverrideItems } = useCartStore(selectCartOps);
  const router = useRouter();

  const handle = () => {
    const item = {
      id: product.id || `${sectionSlug}/${product.slug}`,
      title: product.title,
      price: product.price,
      qty: Math.max(1, qty || 1),
      image: product.image,
      code: product.code,
      slug: product.slug,
    };

    setCheckoutMode("buy-now");
    setOverrideItems([item]);
    router.push("/checkout");
  };

  return (
    <button
      type="button"
      onClick={handle}
      className={[
        "relative inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold",
        "text-white bg-gradient-to-b from-rose-500 to-rose-700",
        "shadow-[0_6px_0_0_rgba(159,18,57,1),0_12px_24px_rgba(0,0,0,0.25)]",
        "ring-1 ring-inset ring-rose-800/40",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-500",
        "active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(159,18,57,1),0_8px_16px_rgba(0,0,0,0.2)]",
        "transition-transform",
      ].join(" ")}
      aria-label="Comprar ahora"
    >
      Comprar ahora
    </button>
  );
}
