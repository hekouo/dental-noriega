import { PACKAGE_PROFILES, type PackageProfileKey } from "@/lib/shipping/packageProfiles";
import { STANDARD_BOX_DIMS_CM } from "@/lib/shipping/packageDebug";

export type DimsSourceDisplay = "override" | "standard_box" | "products";

type ShippingPackageBillable = {
  mass_weight_g?: number;
  tare_weight_g?: number;
  missing_weight_fields_count?: number;
  dims_cm?: { length_cm: number; width_cm: number; height_cm: number };
  dims_source?: string;
  profile_used?: string | null;
  volumetric_weight_kg?: number;
  billable_weight_kg?: number;
  volumetric_factor?: number;
  weight_g?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
};

type ShippingPackageInfoProps = {
  shippingPackageEstimated?: {
    weight_g?: number;
    source?: string;
    fallback_used_count?: number;
    was_clamped?: boolean;
  } | null;
  shippingPackage?: (
    | {
        mode?: "profile" | "custom";
        profile?: PackageProfileKey | null;
        length_cm?: number;
        width_cm?: number;
        height_cm?: number;
        weight_g?: number;
      }
    | ShippingPackageBillable
  ) | null;
  /** Cuando no hay override, usar "standard_box" para mostrar 25×20×15 y etiqueta (standard_box) */
  dims_source?: DimsSourceDisplay | null;
};

/**
 * Componente readonly para mostrar información del empaque usado para cotización
 * (no editable, solo informativo)
 * Incluye masa, volumétrico y peso facturable cuando metadata.shipping_package está disponible
 */
export default function ShippingPackageInfo({
  shippingPackageEstimated,
  shippingPackage,
  dims_source: dimsSourceProp,
}: ShippingPackageInfoProps) {
  // Nueva estructura: shipping_package con mass_weight_g, volumetric_weight_kg, billable_weight_kg
  const hasBillable =
    shippingPackage &&
    typeof (shippingPackage as ShippingPackageBillable).mass_weight_g === "number" &&
    typeof (shippingPackage as ShippingPackageBillable).billable_weight_kg === "number";

  const hasEstimated =
    shippingPackageEstimated && typeof shippingPackageEstimated.weight_g === "number";
  const hasLegacyPackage =
    shippingPackage && !hasBillable && ((shippingPackage as { mode?: string }).mode || (shippingPackage as { profile?: string }).profile);

  if (!hasBillable && !hasEstimated && !hasLegacyPackage) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Empaque usado para cotización
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Sin estimación (legacy)
        </p>
      </div>
    );
  }

  // Mostrar masa, volumétrico, facturable (nueva estructura)
  if (hasBillable) {
    const pkg = shippingPackage as ShippingPackageBillable;
    const massKg = (pkg.mass_weight_g ?? 0) / 1000;
    const volumetricKg = pkg.volumetric_weight_kg ?? 0;
    const billableKg = pkg.billable_weight_kg ?? 0;
    const factor = pkg.volumetric_factor ?? 5000;
    const dimsSource = dimsSourceProp ?? pkg.dims_source ?? null;
    const dims =
      dimsSource === "standard_box"
        ? {
            length_cm: STANDARD_BOX_DIMS_CM.length,
            width_cm: STANDARD_BOX_DIMS_CM.width,
            height_cm: STANDARD_BOX_DIMS_CM.height,
          }
        : pkg.dims_cm ?? { length_cm: 0, width_cm: 0, height_cm: 0 };
    const dimsLabel =
      dimsSource === "standard_box"
        ? "standard_box"
        : dimsSource === "override"
          ? "override"
          : pkg.dims_source ?? null;

    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Empaque usado para cotización
        </h4>
        <div className="text-sm space-y-2">
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">Masa total:</span>{" "}
            {(pkg.mass_weight_g ?? 0).toLocaleString()}g ({(massKg).toFixed(3)} kg)
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">Volumétrico:</span> {(volumetricKg).toFixed(3)} kg
            <span className="text-gray-500 dark:text-gray-400 ml-1">
              (factor {factor})
            </span>
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">Billable:</span> {(billableKg).toFixed(3)} kg
          </p>
          {dims.length_cm > 0 && dims.width_cm > 0 && dims.height_cm > 0 && (
            <p className="text-gray-600 dark:text-gray-400">
              Dimensiones: {dims.length_cm}×{dims.width_cm}×{dims.height_cm} cm
              {dimsLabel && (
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  ({dimsLabel})
                </span>
              )}
            </p>
          )}
          {(pkg.missing_weight_fields_count ?? 0) > 0 && (
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Productos sin peso (fallback):</span>{" "}
              {pkg.missing_weight_fields_count}
            </p>
          )}
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 italic">
          Skydropx cobra el mayor entre masa y volumétrico
        </p>
      </div>
    );
  }

  // Mostrar información estimada legacy (peso calculado en checkout)
  if (hasEstimated) {
    const estimated = shippingPackageEstimated!;
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Empaque usado para cotización
        </h4>
        <div className="text-sm space-y-1">
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-medium">Peso estimado:</span> {estimated.weight_g || "N/A"}g
          </p>
          {estimated.fallback_used_count && estimated.fallback_used_count > 0 && (
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Productos sin peso (fallback):</span>{" "}
              {estimated.fallback_used_count}
            </p>
          )}
          {estimated.was_clamped && (
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-medium">Ajustado al mínimo:</span> Sí (mínimo 1kg requerido)
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
            Calculado automáticamente en checkout (suma de pesos de productos)
          </p>
        </div>
      </div>
    );
  }

  // Mostrar información del empaque legacy (perfil o personalizado)
  if (hasLegacyPackage) {
    const pkg = shippingPackage as { mode?: string; profile?: PackageProfileKey; length_cm?: number; width_cm?: number; height_cm?: number; weight_g?: number };
    const isProfile = pkg.mode === "profile" && pkg.profile;
    const isCustom = pkg.mode === "custom";

    return (
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          Empaque usado para cotización
        </h4>
        <div className="text-sm space-y-1">
          {isProfile && pkg.profile && (
            <>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Perfil:</span> {PACKAGE_PROFILES[pkg.profile].label}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Dimensiones: {PACKAGE_PROFILES[pkg.profile].length_cm}×
                {PACKAGE_PROFILES[pkg.profile].width_cm}×
                {PACKAGE_PROFILES[pkg.profile].height_cm} cm | Peso base:{" "}
                {PACKAGE_PROFILES[pkg.profile].weight_g}g
              </p>
            </>
          )}
          {isCustom && (
            <>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Modo:</span> Personalizado
              </p>
              {pkg.length_cm && pkg.width_cm && pkg.height_cm && (
                <p className="text-gray-600 dark:text-gray-400">
                  Dimensiones: {pkg.length_cm}×{pkg.width_cm}×{pkg.height_cm} cm
                </p>
              )}
              {pkg.weight_g && (
                <p className="text-gray-600 dark:text-gray-400">
                  Peso: {pkg.weight_g}g
                </p>
              )}
            </>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
            Usado para obtener cotizaciones de envío
          </p>
        </div>
      </div>
    );
  }

  return null;
}
