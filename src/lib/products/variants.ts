/**
 * Helper para identificar productos que requieren selección de variantes
 * y definir las opciones disponibles
 */

export type VariantType =
  | "arco-niti-redondo"
  | "arco-niti-rectangular"
  | "tubos-malla"
  | "brackets-carton";

export type VariantConfig = {
  type: VariantType;
  required: boolean;
  options: {
    medida?: string[];
    arcada?: string[];
    pieza?: string[];
    sistema?: string[];
  };
};

/**
 * Identifica si un producto requiere selección de variantes
 */
export function requiresVariants(productTitle: string, productSlug?: string): VariantType | null {
  const titleLower = productTitle.toLowerCase();
  const slugLower = productSlug?.toLowerCase() || "";

  // ARCO NITI REDONDO 12, 14, 16, 18 PAQUETE CON 10
  if (
    titleLower.includes("arco niti redondo") ||
    titleLower.includes("arco niti") && titleLower.includes("redondo")
  ) {
    return "arco-niti-redondo";
  }

  // ARCO NITI RECTANGULAR PAQUETE CON 10
  if (
    titleLower.includes("arco niti rectangular") ||
    (titleLower.includes("arco niti") && titleLower.includes("rectangular"))
  ) {
    return "arco-niti-rectangular";
  }

  // TUBOS CON MALLA 1EROS o 2o molar KIT CON 200 tubos
  if (
    titleLower.includes("tubos con malla") ||
    titleLower.includes("tubos") && titleLower.includes("malla")
  ) {
    return "tubos-malla";
  }

  // BRACKETS CARTÓN MBT, ROTH, EDGEWISE
  if (
    titleLower.includes("brackets cartón") ||
    titleLower.includes("brackets carton") ||
    (titleLower.includes("brackets") && (titleLower.includes("mbt") || titleLower.includes("roth") || titleLower.includes("edgewise")))
  ) {
    return "brackets-carton";
  }

  return null;
}

/**
 * Obtiene la configuración de variantes para un tipo
 */
export function getVariantConfig(type: VariantType): VariantConfig {
  switch (type) {
    case "arco-niti-redondo":
      return {
        type: "arco-niti-redondo",
        required: true,
        options: {
          medida: ['0.012"', '0.014"', '0.016"', '0.018"'],
          arcada: ["Superior", "Inferior"],
        },
      };
    case "arco-niti-rectangular":
      return {
        type: "arco-niti-rectangular",
        required: true,
        options: {
          medida: [
            '0.016" x 0.016"',
            '0.016" x 0.022"',
            '0.017" x 0.025"',
            '0.018" x 0.025"',
            '0.019" x 0.025"',
          ],
          arcada: ["Superior", "Inferior"],
        },
      };
    case "tubos-malla":
      return {
        type: "tubos-malla",
        required: true,
        options: {
          pieza: ["1eros molares", "2dos molares"],
        },
      };
    case "brackets-carton":
      return {
        type: "brackets-carton",
        required: true,
        options: {
          sistema: ["MBT", "Roth", "Edgewise"],
        },
      };
  }
}

/**
 * Construye el texto de variant_detail a partir de las selecciones
 */
export function buildVariantDetail(
  type: VariantType,
  selections: Record<string, string | undefined>,
): string {
  const parts: string[] = [];

  switch (type) {
    case "arco-niti-redondo":
    case "arco-niti-rectangular":
      if (selections.medida) {
        parts.push(`Medida: ${selections.medida}`);
      }
      if (selections.arcada) {
        parts.push(`Arcada: ${selections.arcada}`);
      }
      break;
    case "tubos-malla":
      if (selections.pieza) {
        parts.push(`Pieza: ${selections.pieza}`);
      }
      break;
    case "brackets-carton":
      if (selections.sistema) {
        parts.push(`Sistema: ${selections.sistema}`);
      }
      break;
  }

  return parts.join(" · ");
}

/**
 * Valida que todas las variantes requeridas estén seleccionadas
 */
export function validateVariants(
  type: VariantType,
  selections: Record<string, string | undefined>,
): { valid: boolean; missing: string[] } {
  const config = getVariantConfig(type);
  const missing: string[] = [];

  if (config.options.medida && !selections.medida) {
    missing.push("Medida del arco");
  }
  if (config.options.arcada && !selections.arcada) {
    missing.push("Arcada");
  }
  if (config.options.pieza && !selections.pieza) {
    missing.push("Pieza");
  }
  if (config.options.sistema && !selections.sistema) {
    missing.push("Sistema");
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

