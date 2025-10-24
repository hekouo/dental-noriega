"use client";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/store/checkoutStore";

type Props = {
  product: {
    title: string;
    price: number;
    image?: string;
    imageResolved?: string;
    slug: string;
  };
  sectionSlug: string;
  qty: number;
};

export default function BuyNowButton({ product, sectionSlug, qty }: Props) {
  const { setItems } = useCheckout();
  const router = useRouter();

  const handle = () => {
    const item = {
      id: `${sectionSlug}/${product.slug}`,
      title: product.title,
      price: product.price,
      image: product.image,
      imageResolved: product.imageResolved,
      qty: Math.max(1, qty || 1),
      sectionSlug,
      slug: product.slug,
    };
    setItems([item]);
    router.push("/checkout");
  };

  return (
    <button
      onClick={handle}
      className="px-4 py-2 rounded-lg font-semibold"
      style={{ backgroundColor: "#D4AF37", color: "#1f2937" }}
    >
      Comprar ya
    </button>
  );
}
