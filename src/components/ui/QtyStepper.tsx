// src/components/ui/QtyStepper.tsx
"use client";
import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/store/cartStore";

type QtyProps = {
  value?: number; // opcional, si el padre es client
  defaultValue?: number; // serializable, uso común con server
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  // opcional, solo se usa si el padre también es client
  onValueChange?: (n: number) => void;
  // para integrarse con el carrito sin callbacks del server:
  productId?: string; // si viene, actualiza cartStore internamente
};

export default function QtyStepper({
  value,
  defaultValue = 1,
  min = 1,
  max = 99,
  disabled,
  className,
  onValueChange,
  productId,
}: QtyProps) {
  const [qty, setQty] = useState(value ?? defaultValue);

  const setQtyClamped = (n: number) => {
    const v = Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
    setQty(v);
    // Solo emite si el padre ES client
    onValueChange?.(v);
  };

  // Si viene productId, sincroniza con el store sin pedir callback del server
  const setCartQty = useCartStore.getState?.().setCartQty;
  useEffect(() => {
    if (productId && setCartQty) setCartQty(productId, undefined, qty);
  }, [productId, qty, setCartQty]);

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <button
        type="button"
        disabled={disabled || qty <= min}
        onClick={() => setQtyClamped(qty - 1)}
        aria-label="Disminuir"
        className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={qty}
        onChange={(e) => setQtyClamped(parseInt(e.currentTarget.value, 10))}
        className="w-12 text-center border rounded"
        aria-label="Cantidad"
      />
      <button
        type="button"
        disabled={disabled || qty >= max}
        onClick={() => setQtyClamped(qty + 1)}
        aria-label="Aumentar"
        className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
}
