"use client";

import { useState, useEffect } from "react";

type ShippingPackageFinalClientProps = {
  orderId: string;
  currentPackageFinal: {
    weight_g?: number;
    length_cm?: number;
    width_cm?: number;
    height_cm?: number;
    updated_at?: string;
  } | null;
};

/**
 * Componente para capturar peso y dimensiones reales del paquete (para crear guía)
 */
export default function ShippingPackageFinalClient({
  orderId,
  currentPackageFinal,
}: ShippingPackageFinalClientProps) {
  const [weightG, setWeightG] = useState<string>(
    currentPackageFinal?.weight_g ? String(currentPackageFinal.weight_g) : "",
  );
  const [lengthCm, setLengthCm] = useState<string>(
    currentPackageFinal?.length_cm ? String(currentPackageFinal.length_cm) : "",
  );
  const [widthCm, setWidthCm] = useState<string>(
    currentPackageFinal?.width_cm ? String(currentPackageFinal.width_cm) : "",
  );
  const [heightCm, setHeightCm] = useState<string>(
    currentPackageFinal?.height_cm ? String(currentPackageFinal.height_cm) : "",
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
      const weight = parseFloat(weightG);
      const length = parseFloat(lengthCm);
      const width = parseFloat(widthCm);
      const height = parseFloat(heightCm);

      if (
        isNaN(weight) ||
        isNaN(length) ||
        isNaN(width) ||
        isNaN(height) ||
        weight <= 0 ||
        length <= 0 ||
        width <= 0 ||
        height <= 0
      ) {
        setError("Todos los campos deben ser números válidos mayores a 0.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/orders/set-shipping-package-final", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          weight_g: Math.round(weight),
          length_cm: Math.round(length),
          width_cm: Math.round(width),
          height_cm: Math.round(height),
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.message || "Error al guardar el paquete final");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setError(null);
      // Recargar página para reflejar cambios
      window.location.reload();
    } catch (err) {
      console.error("[ShippingPackageFinalClient] Error:", err);
      setError("Error de red al guardar el paquete final");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Paquete real (para guía)
      </h4>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
        Captura el peso y las medidas reales de la caja armada. Este paquete se usará para crear la guía en Skydropx.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="final-weight-g"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Peso (g) *
          </label>
          <input
            id="final-weight-g"
            type="number"
            min="1"
            step="1"
            value={weightG}
            onChange={(e) => setWeightG(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            placeholder="Ej: 2200"
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="final-length-cm"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Largo (cm) *
          </label>
          <input
            id="final-length-cm"
            type="number"
            min="1"
            step="1"
            value={lengthCm}
            onChange={(e) => setLengthCm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            placeholder="Ej: 40"
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="final-width-cm"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Ancho (cm) *
          </label>
          <input
            id="final-width-cm"
            type="number"
            min="1"
            step="1"
            value={widthCm}
            onChange={(e) => setWidthCm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            placeholder="Ej: 30"
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="final-height-cm"
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Alto (cm) *
          </label>
          <input
            id="final-height-cm"
            type="number"
            min="1"
            step="1"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
            placeholder="Ej: 20"
            disabled={loading}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {loading ? "Guardando..." : "Guardar paquete"}
        </button>
      </div>

      {error && (
        <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
          <p className="text-xs text-green-700 dark:text-green-300">Paquete guardado exitosamente</p>
        </div>
      )}

      {currentPackageFinal && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Última actualización:{" "}
          {currentPackageFinal.updated_at
            ? new Date(currentPackageFinal.updated_at).toLocaleString("es-MX")
            : "N/A"}
        </div>
      )}
    </div>
  );
}
