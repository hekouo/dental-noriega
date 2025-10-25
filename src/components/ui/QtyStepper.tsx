"use client";
import { Minus, Plus } from "lucide-react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
};

export default function QtyStepper({ 
  value, 
  onChange, 
  min = 1, 
  max = 99, 
  disabled = false,
  className = ""
}: Props) {
  const handleDecrement = () => {
    if (value > min && !disabled) {
      onChange(Math.max(min, value - 1));
    }
  };

  const handleIncrement = () => {
    if (value < max && !disabled) {
      onChange(Math.min(max, value + 1));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  return (
    <div className={`flex items-center border border-gray-300 rounded-md bg-white ${className}`}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Disminuir cantidad"
      >
        <Minus size={16} />
      </button>
      
      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        min={min}
        max={max}
        disabled={disabled}
        className="w-16 px-2 py-2 text-center border-x border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        aria-label="Cantidad"
      />
      
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Aumentar cantidad"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
