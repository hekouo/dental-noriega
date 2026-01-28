"use client";

import { useState, useEffect } from "react";
import { type PackageProfileKey } from "@/lib/shipping/packageProfiles";

type ProductShippingEditorClientProps = {
  productId: string;
  initialWeightG: number | null;
  initialLengthCm: number | null;
  initialWidthCm: number | null;
  initialHeightCm: number | null;
  initialProfile: PackageProfileKey | null;
};

/**
 * Helper: Obtener mensaje de error según código
 */
function getErrorMessage(code: string | undefined, message: string | undefined): string {
  if (code === "unauthorized") {
    return "No tienes permisos para realizar esta acción.";
  }
  if (code === "invalid_request") {
    return message || "Datos inválidos.";
  }
  if (code === "invalid_dimensions") {
    return message || "Dimensiones inválidas.";
  }
  return message || "Error al guardar las dimensiones.";
}

/**
 * Componente para editar dimensiones de envío de un producto
 */
export default function ProductShippingEditorClient({
  productId,
  initialWeightG,
  initialLengthCm,
  initialWidthCm,
  initialHeightCm,
  initialProfile,
}: ProductShippingEditorClientProps) {
  const [weightG, setWeightG] = useState<string>(
    initialWeightG !== null && initialWeightG !== undefined ? String(initialWeightG) : "",
  );
  const [lengthCm, setLengthCm] = useState<string>(
    initialLengthCm !== null && initialLengthCm !== undefined ? String(initialLengthCm) : "",
  );
  const [widthCm, setWidthCm] = useState<string>(
    initialWidthCm !== null && initialWidthCm !== undefined ? String(initialWidthCm) : "",
  );
  const [heightCm, setHeightCm] = useState<string>(
    initialHeightCm !== null && initialHeightCm !== undefined ? String(initialHeightCm) : "",
  );
  const [profile, setProfile] = useState<PackageProfileKey | "">(
    initialProfile || "",
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

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const body: {
        productId: string;
        weight_g?: number | null;
        length_cm?: number | null;
        width_cm?: number | null;
        height_cm?: number | null;
        shipping_profile?: PackageProfileKey | null;
      } = {
        productId,
      };

      // Solo incluir valores si tienen contenido
      if (weightG.trim() !== "") {
        const parsed = parseFloat(weightG);
        if (isNaN(parsed)) {
          setError("El peso debe ser un número válido.");
          setLoading(false);
          return;
        }
        body.weight_g = parsed;
      } else {
        body.weight_g = null;
      }

      if (lengthCm.trim() !== "") {
        const parsed = parseFloat(lengthCm);
        if (isNaN(parsed)) {
          setError("El largo debe ser un número válido.");
          setLoading(false);
          return;
        }
        body.length_cm = parsed;
      } else {
        body.length_cm = null;
      }

      if (widthCm.trim() !== "") {
        const parsed = parseFloat(widthCm);
        if (isNaN(parsed)) {
          setError("El ancho debe ser un número válido.");
          setLoading(false);
          return;
        }
        body.width_cm = parsed;
      } else {
        body.width_cm = null;
      }

      if (heightCm.trim() !== "") {
        const parsed = parseFloat(heightCm);
        if (isNaN(parsed)) {
          setError("El alto debe ser un número válido.");
          setLoading(false);
          return;
        }
        body.height_cm = parsed;
      } else {
        body.height_cm = null;
      }

      body.shipping_profile = profile === "" ? null : (profile as PackageProfileKey);

      const res = await fetch("/api/admin/products/update-shipping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.ok) {
        const errorMessage = getErrorMessage(data.code, data.message);
        setError(errorMessage);
        return;
      }

      setSuccess(true);
      // Refrescar página para mostrar cambios
      window.location.reload();
    } catch (err) {
      console.error("[ProductShippingEditorClient] Error:", err);
      setError("Error de red al guardar las dimensiones.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold">Dimensiones de envío</h3>
      <p className="text-sm text-gray-600">
        Estas dimensiones se usan para estimar el empaque al crear pedidos.
      </p>

      {/* Perfil recomendado */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Perfil recomendado
        </label>
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value as PackageProfileKey | "")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Sin perfil</option>
          <option value="ENVELOPE">Sobre (ENVELOPE)</option>
          <option value="BOX_S">Caja Pequeña (BOX_S)</option>
          <option value="BOX_M">Caja Mediana (BOX_M)</option>
          <option value="CUSTOM">Personalizado (CUSTOM)</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Perfil sugerido para este producto. Se usa como referencia al seleccionar empaque en pedidos.
        </p>
      </div>

      {/* Dimensiones */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Peso (g)
          </label>
          <input
            type="number"
            value={weightG}
            onChange={(e) => setWeightG(e.target.value)}
            min="1"
            max="50000"
            step="1"
            placeholder="Ej: 150"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Largo (cm)
          </label>
          <input
            type="number"
            value={lengthCm}
            onChange={(e) => setLengthCm(e.target.value)}
            min="1"
            max="200"
            step="0.1"
            placeholder="Ej: 25"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ancho (cm)
          </label>
          <input
            type="number"
            value={widthCm}
            onChange={(e) => setWidthCm(e.target.value)}
            min="1"
            max="200"
            step="0.1"
            placeholder="Ej: 20"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alto (cm)
          </label>
          <input
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            min="1"
            max="200"
            step="0.1"
            placeholder="Ej: 15"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">Dimensiones guardadas correctamente.</p>
        </div>
      )}

      {/* Botón Guardar */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {loading ? "Guardando..." : "Guardar dimensiones"}
      </button>
    </div>
  );
}
