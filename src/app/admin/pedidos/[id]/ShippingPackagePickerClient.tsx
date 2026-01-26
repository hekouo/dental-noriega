"use client";

import { useState, useEffect } from "react";
import { PACKAGE_PROFILES, type PackageProfileKey, validatePackageDimensions } from "@/lib/shipping/packageProfiles";

type ShippingPackagePickerClientProps = {
  orderId: string;
  currentPackage: {
    mode?: "profile" | "custom";
    profile?: PackageProfileKey | null;
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    weight_g?: number;
  } | null;
};

/**
 * Componente para seleccionar perfil de empaque o dimensiones personalizadas
 */
export default function ShippingPackagePickerClient({
  orderId,
  currentPackage,
}: ShippingPackagePickerClientProps) {
  const [mode, setMode] = useState<"profile" | "custom">(
    currentPackage?.mode || "profile",
  );
  const [selectedProfile, setSelectedProfile] = useState<PackageProfileKey>(
    (currentPackage?.profile as PackageProfileKey) || "BOX_S",
  );
  const [customLength, setCustomLength] = useState<string>(
    currentPackage?.mode === "custom" ? String(currentPackage.length_cm) : "25",
  );
  const [customWidth, setCustomWidth] = useState<string>(
    currentPackage?.mode === "custom" ? String(currentPackage.width_cm) : "20",
  );
  const [customHeight, setCustomHeight] = useState<string>(
    currentPackage?.mode === "custom" ? String(currentPackage.height_cm) : "15",
  );
  const [customWeight, setCustomWeight] = useState<string>(
    currentPackage?.mode === "custom" ? String(currentPackage.weight_g) : "150",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Helper para construir el payload del body
  const buildPackagePayload = (): {
    orderId: string;
    profile?: PackageProfileKey;
    custom?: {
      length_cm: number;
      width_cm: number;
      height_cm: number;
      weight_g: number;
    };
  } => {
    const body: {
      orderId: string;
      profile?: PackageProfileKey;
      custom?: {
        length_cm: number;
        width_cm: number;
        height_cm: number;
        weight_g: number;
      };
    } = {
      orderId,
    };

    if (mode === "profile") {
      body.profile = selectedProfile;
    } else {
      const length = parseFloat(customLength);
      const width = parseFloat(customWidth);
      const height = parseFloat(customHeight);
      const weight = parseFloat(customWeight);

      body.custom = {
        length_cm: length,
        width_cm: width,
        height_cm: height,
        weight_g: weight,
      };
    }

    return body;
  };

  // Helper para validar dimensiones personalizadas
  const validateCustomDimensions = (): { valid: boolean; error?: string } => {
    const length = parseFloat(customLength);
    const width = parseFloat(customWidth);
    const height = parseFloat(customHeight);
    const weight = parseFloat(customWeight);

    if (isNaN(length) || isNaN(width) || isNaN(height) || isNaN(weight)) {
      return { valid: false, error: "Todos los campos personalizados deben ser números válidos." };
    }

    return validatePackageDimensions(length, width, height, weight);
  };

  // Helper para construir mensaje de error
  const buildErrorMessage = (data: {
    code?: string;
    message?: string;
  }): string => {
    if (data.code === "unauthorized") {
      return "No tienes permisos para realizar esta acción.";
    }
    if (data.code === "order_not_found") {
      return "La orden no existe.";
    }
    if (data.code === "label_already_created") {
      return "No se puede cambiar el empaque porque ya se creó la guía. Primero cancela la guía existente.";
    }
    if (data.code === "invalid_profile") {
      return "Perfil inválido.";
    }
    if (data.code === "invalid_dimensions") {
      return data.message || "Dimensiones inválidas.";
    }
    return data.message || "Error al guardar el empaque.";
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validar dimensiones personalizadas si es modo custom
      if (mode === "custom") {
        const validation = validateCustomDimensions();
        if (!validation.valid) {
          setError(validation.error || "Dimensiones inválidas.");
          setLoading(false);
          return;
        }
      }

      // Construir payload
      const body = buildPackagePayload();

      const res = await fetch("/api/admin/orders/set-shipping-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(buildErrorMessage(data));
        return;
      }

      setSuccess(true);
      // Refrescar página para mostrar cambios
      window.location.reload();
    } catch (err) {
      console.error("[ShippingPackagePickerClient] Error:", err);
      setError("Error de red al guardar el empaque.");
    } finally {
      setLoading(false);
    }
  };

  const currentProfile = mode === "profile" ? PACKAGE_PROFILES[selectedProfile] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold">Empaque de envío</h3>
        {currentPackage && (
          <span className="text-xs text-gray-500">
            Actualmente: {currentPackage.mode === "profile" && currentPackage.profile
              ? PACKAGE_PROFILES[currentPackage.profile].label
              : "Personalizado"}
          </span>
        )}
      </div>

      {/* Modo: Profile o Custom */}
      <div className="flex gap-4">
        <label className="flex items-center">
          <input
            type="radio"
            name="mode"
            value="profile"
            checked={mode === "profile"}
            onChange={(e) => setMode(e.target.value as "profile" | "custom")}
            className="mr-2"
          />
          <span className="text-sm">Perfil predefinido</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name="mode"
            value="custom"
            checked={mode === "custom"}
            onChange={(e) => setMode(e.target.value as "profile" | "custom")}
            className="mr-2"
          />
          <span className="text-sm">Personalizado</span>
        </label>
      </div>

      {/* Selector de perfil */}
      {mode === "profile" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Perfil
          </label>
          <select
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value as PackageProfileKey)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="ENVELOPE">
              {PACKAGE_PROFILES.ENVELOPE.label} (
              {PACKAGE_PROFILES.ENVELOPE.length_cm}×
              {PACKAGE_PROFILES.ENVELOPE.width_cm}×
              {PACKAGE_PROFILES.ENVELOPE.height_cm} cm,{" "}
              {PACKAGE_PROFILES.ENVELOPE.weight_g}g)
            </option>
            <option value="BOX_S">
              {PACKAGE_PROFILES.BOX_S.label} (
              {PACKAGE_PROFILES.BOX_S.length_cm}×
              {PACKAGE_PROFILES.BOX_S.width_cm}×
              {PACKAGE_PROFILES.BOX_S.height_cm} cm,{" "}
              {PACKAGE_PROFILES.BOX_S.weight_g}g)
            </option>
            <option value="BOX_M">
              {PACKAGE_PROFILES.BOX_M.label} (
              {PACKAGE_PROFILES.BOX_M.length_cm}×
              {PACKAGE_PROFILES.BOX_M.width_cm}×
              {PACKAGE_PROFILES.BOX_M.height_cm} cm,{" "}
              {PACKAGE_PROFILES.BOX_M.weight_g}g)
            </option>
          </select>
          {currentProfile && (
            <p className="mt-2 text-xs text-gray-500">
              Dimensiones: {currentProfile.length_cm}×{currentProfile.width_cm}×
              {currentProfile.height_cm} cm | Peso base: {currentProfile.weight_g}g
            </p>
          )}
        </div>
      )}

      {/* Campos personalizados */}
      {mode === "custom" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Largo (cm)
            </label>
            <input
              type="number"
              value={customLength}
              onChange={(e) => setCustomLength(e.target.value)}
              min="1"
              max="200"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ancho (cm)
            </label>
            <input
              type="number"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              min="1"
              max="200"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alto (cm)
            </label>
            <input
              type="number"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              min="1"
              max="200"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Peso (g)
            </label>
            <input
              type="number"
              value={customWeight}
              onChange={(e) => setCustomWeight(e.target.value)}
              min="1"
              max="50000"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">Empaque guardado correctamente.</p>
        </div>
      )}

      {/* Botón Guardar */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {loading ? "Guardando..." : "Guardar empaque"}
      </button>
    </div>
  );
}
