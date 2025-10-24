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
    
    setCheckoutMode('buy-now');
    setOverrideItems([item]);
    router.push("/checkout");
  };

  return (
    <button
      type="button"
      onClick={handle}
      className={[
        // base
        "relative inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-yellow-500",
        // color/gradiente
        "bg-gradient-to-b from-yellow-300 to-yellow-600 text-neutral-900",
        // 3D/relieve
        "shadow-[0_6px_0_0_rgba(161,98,7,1),0_12px_24px_rgba(0,0,0,0.25)]",
        // borde brillante sutil
        "ring-1 ring-inset ring-yellow-700/40",
        // interacción
        "active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(161,98,7,1),0_8px_16px_rgba(0,0,0,0.2)]",
        "transition-transform",
      ].join(" ")}
      aria-label="Comprar ahora"
    >
      Comprar ahora
    </button>
  );
}
