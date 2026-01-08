/**
 * Perfiles de empaque predefinidos para envíos
 * Estos valores se usan como defaults y pueden ser personalizados por orden
 */
export type PackageProfileKey = "ENVELOPE" | "BOX_S" | "BOX_M" | "CUSTOM";

export type PackageProfile = {
  label: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_g: number; // Peso base del empaque vacío
};

export const PACKAGE_PROFILES: Record<PackageProfileKey, PackageProfile> = {
  ENVELOPE: {
    label: "Sobre",
    length_cm: 32,
    width_cm: 23,
    height_cm: 1,
    weight_g: 50, // Peso base del sobre vacío
  },
  BOX_S: {
    label: "Caja Pequeña",
    length_cm: 25,
    width_cm: 20,
    height_cm: 15,
    weight_g: 150, // Peso base de caja pequeña vacía
  },
  BOX_M: {
    label: "Caja Mediana",
    length_cm: 35,
    width_cm: 30,
    height_cm: 25,
    weight_g: 300, // Peso base de caja mediana vacía
  },
  CUSTOM: {
    label: "Personalizado",
    length_cm: 20,
    width_cm: 20,
    height_cm: 10,
    weight_g: 100, // Default para personalizado (se sobreescribe)
  },
};

/**
 * Obtiene un perfil por su clave
 */
export function getPackageProfile(key: PackageProfileKey): PackageProfile {
  return PACKAGE_PROFILES[key];
}

/**
 * Valida que las dimensiones estén dentro de límites razonables
 */
export function validatePackageDimensions(
  length_cm: number,
  width_cm: number,
  height_cm: number,
  weight_g: number,
): { valid: boolean; error?: string } {
  if (length_cm <= 0 || width_cm <= 0 || height_cm <= 0) {
    return { valid: false, error: "Las dimensiones deben ser mayores a 0" };
  }
  if (length_cm > 200 || width_cm > 200 || height_cm > 200) {
    return { valid: false, error: "Las dimensiones no pueden exceder 200 cm" };
  }
  if (weight_g <= 0) {
    return { valid: false, error: "El peso debe ser mayor a 0" };
  }
  if (weight_g > 50000) {
    return { valid: false, error: "El peso no puede exceder 50 kg (50000 g)" };
  }
  return { valid: true };
}
