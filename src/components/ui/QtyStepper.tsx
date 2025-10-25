// src/components/ui/QtyStepper.tsx
"use client";
type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
};

export default function QtyStepper({
  value,
  min = 1,
  max = 99,
  onChange,
}: Props) {
  function clamp(n: number) {
    return Math.min(max, Math.max(min, Math.floor(n || min)));
  }
  return (
    <div className="inline-flex items-center gap-2 border rounded-lg px-2 py-1">
      <button
        type="button"
        aria-label="Restar"
        onClick={() => onChange(clamp(value - 1))}
        className="px-2 py-1 rounded hover:bg-gray-100"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        className="w-12 text-center outline-none"
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
      />
      <button
        type="button"
        aria-label="Sumar"
        onClick={() => onChange(clamp(value + 1))}
        className="px-2 py-1 rounded hover:bg-gray-100"
      >
        +
      </button>
    </div>
  );
}
