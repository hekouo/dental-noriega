/**
 * Utilidades para parsear y convertir variant_detail entre string y JSON
 */

import { parseColorVariantDetail } from "./colors";

export type VariantDetailJSON = {
  color?: string;
  notes?: string;
  // Para otras variantes (arcos, brackets, etc.)
  [key: string]: string | undefined;
};

/**
 * Convierte variant_detail (string) a JSON para guardar en order_items.variant_detail
 * Ejemplo: "Color: Azul · Medida: 0.016" -> { color: "Azul", medida: "0.016" }
 */
export function variantDetailToJSON(variantDetail: string | null | undefined): VariantDetailJSON | null {
  if (!variantDetail) return null;

  const result: VariantDetailJSON = {};

  // Separar por " · " (separador usado en formatVariantDetail)
  const parts = variantDetail.split(" · ");

  for (const part of parts) {
    const match = part.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase();
      const value = match[2].trim();

      // Mapear claves conocidas
      if (key === "color") {
        result.color = value;
      } else if (key === "preferencia") {
        result.notes = value;
      } else {
        // Otras variantes (medida, arcada, pieza, sistema, etc.)
        result[key] = value;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Convierte variant_detail JSON a string para mostrar en UI
 */
export function variantDetailFromJSON(variantDetailJSON: VariantDetailJSON | null | undefined): string | null {
  if (!variantDetailJSON || Object.keys(variantDetailJSON).length === 0) {
    return null;
  }

  const parts: string[] = [];

  // Color siempre primero
  if (variantDetailJSON.color) {
    parts.push(`Color: ${variantDetailJSON.color}`);
    if (variantDetailJSON.notes) {
      parts.push(`Preferencia: ${variantDetailJSON.notes}`);
    }
  }

  // Otras variantes
  for (const [key, value] of Object.entries(variantDetailJSON)) {
    if (key !== "color" && key !== "notes" && value) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      parts.push(`${label}: ${value}`);
    }
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

