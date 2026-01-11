import { PACKAGE_PROFILES, type PackageProfileKey } from "@/lib/shipping/packageProfiles";

type ShippingPackageInfoProps = {
  shippingPackageEstimated?: {
    weight_g?: number;
    source?: string;
    fallback_used_count?: number;
    was_clamped?: boolean;
  } | null;
  shippingPackage?: {
    mode?: "profile" | "custom";
    profile?: PackageProfileKey | null;
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    weight_g?: number;
  } | null;
};

/**
 * Componente readonly para mostrar información del empaque usado para cotización
 * (no editable, solo informativo)
 */
export default function ShippingPackageInfo({
  shippingPackageEstimated,
  shippingPackage,
}: ShippingPackageInfoProps) {
  // Determinar qué mostrar
  const hasEstimated = shippingPackageEstimated && typeof shippingPackageEstimated.weight_g === "number";
  const hasPackage = shippingPackage && (shippingPackage.mode || shippingPackage.profile);

  if (!hasEstimated && !hasPackage) {
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

  // Mostrar información estimada (peso calculado en checkout)
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
              <span className="font-medium">Productos sin peso (fallback):</span> {estimated.fallback_used_count}
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

  // Mostrar información del empaque seleccionado (perfil o personalizado)
  if (hasPackage) {
    const pkg = shippingPackage!;
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
