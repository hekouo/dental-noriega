"use client";

import { formatCurrency } from "@/lib/utils/currency";
import { pointsFor } from "@/lib/utils/points";
import { useCartStore } from "@/lib/store/cartStore";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { ShoppingCart, CreditCard } from "lucide-react";
import { useState, memo } from "react";
import ProductImage from "@/components/ProductImage";
import PointsBadge from "@/components/PointsBadge";

interface ProductCardProps {
  sku: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
}

export const ProductCard = memo(function ProductCard({
  sku,
  name,
  price,
  description,
  image,
}: ProductCardProps) {
  const addToCart = useCartStore((state) => state.addToCart);
  const upsertSingleToCheckout = useCheckoutStore(
    (state) => state.upsertSingleToCheckout,
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingToCheckout, setIsAddingToCheckout] = useState(false);

  const handleAddToCart = () => {
    setIsAdding(true);
    addToCart({ id: sku, title: name, price, qty: 1, imageUrl: image });
    setTimeout(() => setIsAdding(false), 1000);
  };

  const handleAddToCheckout = () => {
    setIsAddingToCheckout(true);
    upsertSingleToCheckout(
      { id: sku, title: name, price, qty: 1, imageUrl: image },
      true,
    );
    setTimeout(() => setIsAddingToCheckout(false), 1000);
  };

  const points = pointsFor(price, 1);

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden flex flex-col">
      {/* Imagen */}
      {image && (
        <div className="relative w-full aspect-square bg-gray-100">
          <ProductImage
            src={image}
            alt={name}
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          />
        </div>
      )}

      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1 line-clamp-2">{name}</h3>
            <p className="text-xs text-gray-500">SKU: {sku}</p>
          </div>
          <PointsBadge points={points} />
        </div>

        {description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {description}
          </p>
        )}

        <div className="mb-4 mt-auto">
          <span className="text-2xl font-bold text-primary-600">
            {formatCurrency(price)}
          </span>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShoppingCart size={18} />
            {isAdding ? "Agregado!" : "Agregar al Carrito"}
          </button>

          <button
            onClick={handleAddToCheckout}
            disabled={isAddingToCheckout}
            className="w-full btn btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CreditCard size={18} />
            {isAddingToCheckout ? "Agregado!" : "Añadir al Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
});
