// src/components/ui/QtyStepper.tsx
"use client";
import { useState, useEffect, KeyboardEvent } from "react";

type QtyProps = {
  value?: number; // opcional, si el padre es client
  defaultValue?: number; // serializable, uso común con server
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  // opcional, solo se usa si el padre también es client
  onValueChange?: (n: number) => void;
};

export default function QtyStepper({
  value,
  defaultValue = 1,
  min = 1,
  max = 99,
  disabled,
  className,
  onValueChange,
}: QtyProps) {
  const [qty, setQty] = useState(value ?? defaultValue);

  const setQtyClamped = (n: number) => {
    const v = Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
    setQty(v);
    // Solo emite si el padre ES client
    onValueChange?.(v);
  };

  // Sincronizar con value externo si cambia
  useEffect(() => {
    if (value !== undefined) {
      setQty(value);
    }
  }, [value]);

  // Validar entrada del teclado: bloquear e, -, +
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Bloquear: e, E, -, +, .
    if (
      e.key === "e" ||
      e.key === "E" ||
      e.key === "-" ||
      e.key === "+" ||
      e.key === "."
    ) {
      e.preventDefault();
      return;
    }
    // Permitir: números, Backspace, Delete, ArrowLeft, ArrowRight, Tab
    const allowedKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Enter",
    ];
    if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

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
        onChange={(e) =>
          setQtyClamped(parseInt(e.currentTarget.value, 10) || min)
        }
        onKeyDown={handleKeyDown}
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
