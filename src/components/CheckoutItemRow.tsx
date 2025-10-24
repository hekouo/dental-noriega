"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { CheckoutItem } from "@/lib/store/cartStore";

type Props = {
  item: CheckoutItem;
  onToggle: () => void;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
};

export default function CheckoutItemRow({
  item,
  onToggle,
  onQtyChange,
  onRemove,
}: Props) {
  const [localQty, setLocalQty] = useState(item.qty);

  const handleQtyChange = (newQty: number) => {
    const validQty = Math.max(1, newQty);
    setLocalQty(validQty);
    onQtyChange(validQty);
  };

  const handleIncrement = () => {
    handleQtyChange(localQty + 1);
  };

  const handleDecrement = () => {
    handleQtyChange(localQty - 1);
  };

  const subtotal = item.price * localQty;

  return (
    <div className="flex items-center gap-4 rounded-xl border p-4">
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={item.selected}
        onChange={onToggle}
        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />

      {/* Imagen */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
      </div>

      {/* Información del producto */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
        <p className="text-sm text-gray-500">
          ${item.price.toFixed(2)} MXN c/u
        </p>
        {item.variantId && (
          <p className="text-xs text-gray-400">Variante: {item.variantId}</p>
        )}
      </div>

      {/* Selector de cantidad */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleDecrement}
          className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
          disabled={localQty <= 1}
        >
          -
        </button>
        <input
          type="number"
          min="1"
          value={localQty}
          onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)}
          className="w-16 text-center border border-gray-300 rounded px-2 py-1"
        />
        <button
          onClick={handleIncrement}
          className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
        >
          +
        </button>
      </div>

      {/* Subtotal */}
      <div className="text-right">
        <p className="font-semibold text-gray-900">
          ${subtotal.toFixed(2)} MXN
        </p>
      </div>

      {/* Botón eliminar */}
      <button
        onClick={onRemove}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Eliminar del checkout"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
}
