"use client";

import React, { useState, useEffect, KeyboardEvent } from "react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  compact?: boolean;
  ariaLabel?: string;
};

export default function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 999,
  disabled = false,
  compact = false,
  ariaLabel = "Cantidad",
}: Props) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next));
    setLocalValue(clamped);
    onChange(clamped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    if (raw === "") {
      setLocalValue(min);
      onChange(min);
      return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      handleChange(num);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleChange(localValue + 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleChange(localValue - 1);
    }
  };

  const decrement = () => {
    handleChange(localValue - 1);
  };

  const increment = () => {
    handleChange(localValue + 1);
  };

  const inputClasses = compact
    ? "w-10 text-center outline-none text-base bg-transparent text-gray-900 dark:text-gray-100"
    : "w-10 text-center outline-none bg-transparent text-gray-900 dark:text-gray-100";
  const buttonClasses = compact
    ? "h-9 w-6 text-base font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:text-gray-400 dark:disabled:text-gray-600"
    : "h-8 w-6 text-xl text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:text-gray-400 dark:disabled:text-gray-600";
  const containerClasses = compact
    ? "flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 h-9 px-3"
    : "flex items-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1";

  return (
    <div className={containerClasses}>
      <button
        type="button"
        className={buttonClasses}
        aria-label="Disminuir cantidad"
        onClick={decrement}
        disabled={disabled || localValue <= min}
        title="Disminuir cantidad"
      >
        –
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={localValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={inputClasses}
        min={min}
        max={max}
      />
      <button
        type="button"
        className={buttonClasses}
        aria-label="Aumentar cantidad"
        onClick={increment}
        disabled={disabled || localValue >= max}
        title="Aumentar cantidad"
      >
        +
      </button>
    </div>
  );
}

