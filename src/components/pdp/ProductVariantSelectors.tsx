"use client";

import { useState } from "react";
import {
  getVariantConfig,
  VARIANT_OPTIONS,
  formatVariantDetail,
  validateVariantSelections,
} from "@/lib/products/variants";

type Props = {
  productTitle: string;
  onSelectionChange: (variantDetail: string | null) => void;
};

export default function ProductVariantSelectors({
  productTitle,
  onSelectionChange,
}: Props) {
  const config = getVariantConfig(productTitle);
  const [selections, setSelections] = useState<Record<string, string>>({});

  if (!config) {
    return null;
  }

  const variantOptions = VARIANT_OPTIONS[config.variantType];

  const handleSelectionChange = (key: string, value: string) => {
    const newSelections = { ...selections, [key]: value };
    setSelections(newSelections);

    const validation = validateVariantSelections(config.variantType, newSelections);
    if (validation.valid) {
      const variantDetail = formatVariantDetail(config.variantType, newSelections);
      onSelectionChange(variantDetail);
    } else {
      onSelectionChange(null);
    }
  };

  return (
    <div className="mt-4 space-y-4 border-t border-gray-200 pt-4">
      <p className="text-sm font-medium text-gray-700">
        Selecciona las opciones requeridas:
      </p>
      {Object.entries(variantOptions).map(([key, option]) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {option.label}
            {option.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            value={selections[key] || ""}
            onChange={(e) => handleSelectionChange(key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required={option.required}
          >
            <option value="">Selecciona {option.label.toLowerCase()}</option>
            {option.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

