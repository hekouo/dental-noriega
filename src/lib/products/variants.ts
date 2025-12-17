/**
 * Configuración de variantes para productos de ortodoncia
 */

export type VariantConfig = {
  productTitle: string;
  productSlug?: string;
  variantType: "arco-niti-redondo" | "arco-niti-rectangular" | "tubos-malla" | "brackets-carton";
};

// Identificadores de productos que requieren variantes
const VARIANT_PRODUCTS: VariantConfig[] = [
  {
    productTitle: "ARCO NITI REDONDO 12, 14, 16, 18 PAQUETE CON 10",
    variantType: "arco-niti-redondo",
  },
  {
    productTitle: "ARCO NITI RECTANGULAR PAQUETE CON 10",
    variantType: "arco-niti-rectangular",
  },
  {
    productTitle: "TUBOS CON MALLA 1EROS o 2o molar KIT CON 200 tubos",
    variantType: "tubos-malla",
  },
  {
    productTitle: "BRACKETS CARTÓN MBT, ROTH, EDGEWISE",
    variantType: "brackets-carton",
  },
];

/**
 * Verifica si un producto requiere selección de variantes
 */
export function requiresVariants(productTitle: string): boolean {
  return VARIANT_PRODUCTS.some(
    (p) => p.productTitle.toUpperCase() === productTitle.toUpperCase(),
  );
}

/**
 * Obtiene la configuración de variantes para un producto
 */
export function getVariantConfig(productTitle: string): VariantConfig | null {
  return (
    VARIANT_PRODUCTS.find(
      (p) => p.productTitle.toUpperCase() === productTitle.toUpperCase(),
    ) || null
  );
}

/**
 * Opciones de variantes para cada tipo
 */
export const VARIANT_OPTIONS = {
  "arco-niti-redondo": {
    medida: {
      label: "Medida del arco",
      options: ['0.012"', '0.014"', '0.016"', '0.018"'],
      required: true,
    },
    arcada: {
      label: "Arcada",
      options: ["Superior", "Inferior"],
      required: true,
    },
  },
  "arco-niti-rectangular": {
    medida: {
      label: "Medida del arco",
      options: [
        '0.016" x 0.016"',
        '0.016" x 0.022"',
        '0.017" x 0.025"',
        '0.018" x 0.025"',
        '0.019" x 0.025"',
      ],
      required: true,
    },
    arcada: {
      label: "Arcada",
      options: ["Superior", "Inferior"],
      required: true,
    },
  },
  "tubos-malla": {
    pieza: {
      label: "Pieza",
      options: ["1eros molares", "2dos molares"],
      required: true,
    },
  },
  "brackets-carton": {
    sistema: {
      label: "Sistema",
      options: ["MBT", "Roth", "Edgewise"],
      required: true,
    },
  },
};

/**
 * Genera el texto de variant_detail a partir de las selecciones
 */
export function formatVariantDetail(
  variantType: VariantConfig["variantType"],
  selections: Record<string, string>,
): string {
  const parts: string[] = [];

  if (variantType === "arco-niti-redondo" || variantType === "arco-niti-rectangular") {
    if (selections.medida) {
      parts.push(`Medida: ${selections.medida}`);
    }
    if (selections.arcada) {
      parts.push(`Arcada: ${selections.arcada}`);
    }
  } else if (variantType === "tubos-malla") {
    if (selections.pieza) {
      parts.push(`Pieza: ${selections.pieza}`);
    }
  } else if (variantType === "brackets-carton") {
    if (selections.sistema) {
      parts.push(`Sistema: ${selections.sistema}`);
    }
  }

  return parts.join(" · ");
}

/**
 * Valida que todas las variantes requeridas estén seleccionadas
 */
export function validateVariantSelections(
  variantType: VariantConfig["variantType"],
  selections: Record<string, string>,
): { valid: boolean; missing: string[] } {
  const config = VARIANT_OPTIONS[variantType];
  const missing: string[] = [];

  for (const [key, option] of Object.entries(config)) {
    if (option.required && !selections[key]) {
      missing.push(option.label);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

