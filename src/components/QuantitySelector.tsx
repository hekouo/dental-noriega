// src/components/QuantitySelector.tsx
"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Minus, Plus, ShoppingCart } from "lucide-react";
import { pointsFor } from "@/lib/utils/points";
import { waLink } from "@/lib/site";
import PointsBadge from "@/components/PointsBadge";
import AddToCartBtn from "@/components/AddToCartBtn";
import BuyNowButton from "@/components/BuyNowButton";

type Props = {
  productTitle: string;
  sectionName: string;
  price: number;
  product: {
    title: string;
    price: number;
    image?: string;
    imageResolved?: string;
    slug: string;
  };
  sectionSlug: string;
};

export function QuantitySelector({
  productTitle,
  sectionName,
  price,
  product,
  sectionSlug,
}: Props) {
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const pts = useMemo(() => pointsFor(price, quantity), [price, quantity]);

  const whatsappMsg = `Hola, me interesa: ${productTitle} (${sectionName}). ¿Disponibilidad y precio por favor?`;
  const whatsappHref = waLink(whatsappMsg);

  return (
    <>
      {/* Selector de cantidad */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cantidad
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleQuantityChange(-1)}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            aria-label="Disminuir cantidad"
          >
            <Minus size={20} />
          </button>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="w-20 text-center border border-gray-300 rounded-lg px-3 py-2 font-semibold text-lg"
          />
          <button
            onClick={() => handleQuantityChange(1)}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            aria-label="Aumentar cantidad"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Badge de puntos */}
      <div className="mb-6 flex items-center gap-2">
        <PointsBadge points={pts} />
        {pts > 0 && (
          <span className="text-xs text-gray-500">con esta compra</span>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col gap-3">
        {/* CTA Primario: Agregar al carrito */}
        <AddToCartBtn
          productId={`${sectionSlug}/${product.slug}`}
          productTitle={product.title}
          productPrice={product.price}
          qty={quantity}
          image_url={product.image || product.imageResolved}
          className="w-full relative inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 shadow-[0_6px_0_0_rgba(37,99,235,1),0_12px_24px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-primary-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(37,99,235,1),0_8px_16px_rgba(0,0,0,0.2)] transition-transform"
        >
          <ShoppingCart size={20} />
          <span>Agregar al carrito</span>
        </AddToCartBtn>

        {/* CTA Secundario: Comprar ahora */}
        <BuyNowButton
          productId={`${sectionSlug}/${product.slug}`}
          productTitle={product.title}
          productPrice={product.price}
          qty={quantity}
          image_url={product.image || product.imageResolved}
          className="w-full relative inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium text-primary-600 bg-white border-2 border-primary-600 hover:bg-primary-50 shadow-[0_2px_4px_rgba(0,0,0,0.1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 transition-colors"
        />

        {/* Acción alternativa: WhatsApp */}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            "w-full relative inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium gap-2",
            "text-white bg-gradient-to-b from-emerald-500 to-emerald-700",
            "shadow-[0_6px_0_0_rgba(4,120,87,1),0_12px_24px_rgba(0,0,0,0.25)]",
            "ring-1 ring-inset ring-emerald-800/40",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500",
            "active:translate-y-[2px] active:shadow-[0_4px_0_0_rgba(4,120,87,1),0_8px_16px_rgba(0,0,0,0.2)]",
            "transition-transform",
          ].join(" ")}
        >
          <MessageCircle size={20} />
          <span>Consultar por WhatsApp</span>
        </a>
      </div>
    </>
  );
}
