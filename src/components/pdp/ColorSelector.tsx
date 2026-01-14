"use client";

import { useState } from "react";
import { getColorOptions, SURTIDO_OPTION } from "@/lib/products/colors";

type Props = {
  productSlug: string;
  productTitle?: string;
  value: string | null; // Color seleccionado o null
  notes: string | null; // Notas si es surtido
  onChange: (color: string | null, notes: string | null) => void;
  required?: boolean;
};

export default function ColorSelector({
  productSlug,
  productTitle,
  value,
  notes,
  onChange,
  required = false,
}: Props) {
  const colors = getColorOptions(productSlug, productTitle);
  const [localNotes, setLocalNotes] = useState(notes || "");

  if (colors.length === 0) {
    return null;
  }

  const isSurtido = value === SURTIDO_OPTION;

  const handleColorChange = (color: string) => {
    if (color === SURTIDO_OPTION) {
      onChange(SURTIDO_OPTION, localNotes || null);
    } else {
      onChange(color, null);
    }
  };

  const handleNotesChange = (newNotes: string) => {
    setLocalNotes(newNotes);
    if (isSurtido) {
      onChange(SURTIDO_OPTION, newNotes.trim() || null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="color-selector-group">
          Color {required && <span className="text-red-500 dark:text-red-400">*</span>}
        </label>
        <div className="flex flex-wrap gap-2" id="color-selector-group" role="group" aria-describedby="color-selector-help">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handleColorChange(color)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                value === color
                  ? "bg-primary-600 text-white shadow-md"
                  : "bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
              }`}
              aria-pressed={value === color}
              aria-label={`Seleccionar color ${color}`}
            >
              {color}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleColorChange(SURTIDO_OPTION)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              isSurtido
                ? "bg-primary-600 text-white shadow-md"
                : "bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            }`}
            aria-pressed={isSurtido}
            aria-label="Seleccionar surtido (mix)"
          >
            {SURTIDO_OPTION}
          </button>
        </div>
      </div>

      {/* Input de notas si es surtido */}
      {isSurtido && (
        <div>
          <label
            htmlFor="color-notes"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Preferencia de colores (opcional)
          </label>
          <textarea
            id="color-notes"
            value={localNotes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Ej: 2 azules y 1 rojo"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            aria-label="Preferencia de colores para surtido"
          />
        </div>
      )}

      {/* Aviso de disponibilidad */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
        <p>
          Los colores están sujetos a disponibilidad. Si el color seleccionado no está disponible, te enviaremos uno igual o lo más parecido posible. Si necesitas un color específico sin sustitución, indícalo en notas o contáctanos por WhatsApp antes de comprar.
        </p>
      </div>

      {/* Texto de ayuda discreto */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2" id="color-selector-help">
        Nota: Los colores están sujetos a disponibilidad. Si no hay del color seleccionado, te enviaremos uno lo más parecido posible.
      </p>
    </div>
  );
}

