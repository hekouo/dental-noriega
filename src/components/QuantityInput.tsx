// src/components/QuantityInput.tsx
import React from "react";

type Props = {
  min?: number;
  value: number;
  onChange: (v: number) => void;
};

const QuantityInput: React.FC<Props> = ({ min = 1, value, onChange }) => {
  const dec = () => onChange(Math.max(min, (value | 0) - 1));
  const inc = () => onChange((value | 0) + 1);
  const onField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
    onChange(Number.isFinite(n) ? Math.max(min, n) : min);
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-300 overflow-hidden">
      <button
        type="button"
        aria-label="Disminuir"
        onClick={dec}
        className="px-3 py-2 hover:bg-gray-50"
      >
        −
      </button>
      <input
        className="w-16 text-center outline-none py-2"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={onField}
        aria-label="Cantidad"
      />
      <button
        type="button"
        aria-label="Aumentar"
        onClick={inc}
        className="px-3 py-2 hover:bg-gray-50"
      >
        +
      </button>
    </div>
  );
};

export default QuantityInput;
