// src/components/QuantitySelector.tsx
"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Minus, Plus } from "lucide-react";
import { pointsFor } from "@/lib/utils/points";
import { waLink } from "@/lib/site";
import PointsBadge from "@/components/PointsBadge";
import { AddToCartBtn } from "@/components/AddToCartBtn";

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
        <AddToCartBtn
          product={product}
          sectionSlug={sectionSlug}
          qty={quantity}
          className="w-full btn btn-primary py-3 rounded-lg flex items-center justify-center gap-2"
        />

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full btn bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg flex items-center justify-center gap-2"
        >
          <MessageCircle size={20} />
          <span>Consultar por WhatsApp</span>
        </a>
      </div>
    </>
  );
}
