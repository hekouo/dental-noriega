"use client";

import React from "react";
import Link from "next/link";
import { ShoppingCart, MessageCircle } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";
import { getWhatsAppProductUrl } from "@/lib/whatsapp/config";
import { mxnFromCents } from "@/lib/utils/currency";

type PdpStickyCTAProps = {
  product: {
    id: string;
    title: string;
    section: string;
    product_slug: string;
    price_cents: number;
    image_url?: string;
    in_stock?: boolean;
  };
};

export default function PdpStickyCTA({ product }: PdpStickyCTAProps) {
  const addToCart = useCartStore((state) => state.addToCart);
  const [isAdding, setIsAdding] = React.useState(false);

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart({
      id: product.id,
      title: product.title,
      price: mxnFromCents(product.price_cents),
      qty: 1,
      image_url: product.image_url,
      selected: true,
    });
    setTimeout(() => setIsAdding(false), 1000);
  };

  const whatsappUrl = getWhatsAppProductUrl(
    product.title,
    product.section,
  );

  const canBuy = product.in_stock !== false;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div
        className="px-4 py-3 flex gap-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {whatsappUrl && (
          <Link
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 flex items-center justify-center gap-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 active:scale-95"
            aria-label="Contactar por WhatsApp"
          >
            <MessageCircle size={20} />
            <span className="font-medium">WhatsApp</span>
          </Link>
        )}
        <button
          onClick={handleAddToCart}
          disabled={!canBuy || isAdding}
          className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2 min-h-[44px] font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 active:scale-95"
          aria-label="Agregar al carrito"
        >
          <ShoppingCart size={20} />
          <span>{isAdding ? "Agregado!" : "Agregar al carrito"}</span>
        </button>
      </div>
    </div>
  );
}

