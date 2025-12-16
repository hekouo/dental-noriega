"use client";

import { useState, useEffect } from "react";
import {
  type VariantType,
  getVariantConfig,
  buildVariantDetail,
  validateVariants,
} from "@/lib/products/variants";

type Props = {
  variantType: VariantType;
  onSelectionChange: (variantDetail: string | null) => void;
  initialVariantDetail?: string;
};

export default function ProductVariantSelectors({
  variantType,
  onSelectionChange,
  initialVariantDetail,
}: Props) {
  const config = getVariantConfig(variantType);
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Parsear initialVariantDetail si existe
  useEffect(() => {
    if (initialVariantDetail) {
      const parsed: Record<string, string> = {};
      const parts = initialVariantDetail.split(" · ");
      for (const part of parts) {
        if (part.includes("Medida:")) {
          parsed.medida = part.replace("Medida:", "").trim();
        } else if (part.includes("Arcada:")) {
          parsed.arcada = part.replace("Arcada:", "").trim();
        } else if (part.includes("Pieza:")) {
          parsed.pieza = part.replace("Pieza:", "").trim();
        } else if (part.includes("Sistema:")) {
          parsed.sistema = part.replace("Sistema:", "").trim();
        }
      }
      setSelections(parsed);
    }
  }, [initialVariantDetail]);

  // Notificar cambios
  useEffect(() => {
    const validation = validateVariants(variantType, selections);
    if (validation.valid) {
      const detail = buildVariantDetail(variantType, selections);
      onSelectionChange(detail);
    } else {
      onSelectionChange(null);
    }
  }, [variantType, selections, onSelectionChange]);

  const handleChange = (field: string, value: string) => {
    setSelections((prev) => ({ ...prev, [field]: value }));
  };

  const validation = validateVariants(variantType, selections);

  return (
    <div className="mt-4 space-y-4">
      {config.options.medida && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medida del arco <span className="text-red-500">*</span>
          </label>
          <select
            value={selections.medida || ""}
            onChange={(e) => handleChange("medida", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Selecciona una medida</option>
            {config.options.medida.map((medida) => (
              <option key={medida} value={medida}>
                {medida}
              </option>
            ))}
          </select>
        </div>
      )}

      {config.options.arcada && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Arcada <span className="text-red-500">*</span>
          </label>
          <select
            value={selections.arcada || ""}
            onChange={(e) => handleChange("arcada", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Selecciona una arcada</option>
            {config.options.arcada.map((arcada) => (
              <option key={arcada} value={arcada}>
                {arcada}
              </option>
            ))}
          </select>
        </div>
      )}

      {config.options.pieza && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pieza <span className="text-red-500">*</span>
          </label>
          <select
            value={selections.pieza || ""}
            onChange={(e) => handleChange("pieza", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Selecciona una pieza</option>
            {config.options.pieza.map((pieza) => (
              <option key={pieza} value={pieza}>
                {pieza}
              </option>
            ))}
          </select>
        </div>
      )}

      {config.options.sistema && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sistema <span className="text-red-500">*</span>
          </label>
          <select
            value={selections.sistema || ""}
            onChange={(e) => handleChange("sistema", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Selecciona un sistema</option>
            {config.options.sistema.map((sistema) => (
              <option key={sistema} value={sistema}>
                {sistema}
              </option>
            ))}
          </select>
        </div>
      )}

      {!validation.valid && validation.missing.length > 0 && (
        <p className="text-sm text-amber-600 mt-2">
          Por favor selecciona: {validation.missing.join(", ")}
        </p>
      )}
    </div>
  );
}

