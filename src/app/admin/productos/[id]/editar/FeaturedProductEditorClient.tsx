"use client";

import { useState, useEffect } from "react";

type FeaturedProductEditorClientProps = {
  productSlug: string;
  productTitle: string;
  initialPosition: number | null; // null si no está destacado
};

/**
 * Componente para marcar/desmarcar un producto como destacado
 * y asignar su posición (slot 0..7)
 */
export default function FeaturedProductEditorClient({
  productSlug,
  productTitle,
  initialPosition,
}: FeaturedProductEditorClientProps) {
  const [isFeatured, setIsFeatured] = useState<boolean>(initialPosition !== null);
  const [position, setPosition] = useState<string>(
    initialPosition !== null ? String(initialPosition) : "0",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  // Reset success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Reset error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setWarningMessage(null);

    try {
      const positionValue = isFeatured ? parseInt(position, 10) : null;

      if (isFeatured && (isNaN(positionValue!) || positionValue! < 0 || positionValue! > 7)) {
        setError("La posición debe ser un número entre 0 y 7.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/products/featured", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productSlug,
          position: positionValue,
          reason: isFeatured
            ? `Marcar como destacado en posición ${positionValue}`
            : "Desmarcar como destacado",
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        if (data.code === "position_occupied") {
          setError(
            `La posición ${position} ya está ocupada por otro producto${data.occupiedBy ? ` (${data.occupiedBy})` : ""}. Se reemplazará si continúas.`,
          );
        } else {
          setError(data.message || "Error al guardar cambios");
        }
        setLoading(false);
        return;
      }

      // Si hubo swap (se reemplazó otro producto)
      if (data.action === "upserted" && data.previousSlug) {
        setWarningMessage(
          `Se reemplazó el producto anterior (${data.previousSlug}) en la posición ${data.position}.`,
        );
      }

      setSuccess(true);
      // Refrescar página para mostrar cambios
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("[FeaturedProductEditorClient] Error:", err);
      setError("Error de red al guardar cambios.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold">Producto destacado</h3>
      <p className="text-sm text-gray-600">
        Los productos destacados aparecen en la página de inicio (máximo 8 posiciones: 0-7).
      </p>

      {/* Toggle destacado */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="featured"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="featured" className="text-sm font-medium text-gray-700">
          Marcar como destacado
        </label>
      </div>

      {/* Selector de posición (solo si está destacado) */}
      {isFeatured && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Posición (slot 0-7)
          </label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {[0, 1, 2, 3, 4, 5, 6, 7].map((slot) => (
              <option key={slot} value={String(slot)}>
                Slot {slot}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Si la posición está ocupada, se reemplazará el producto anterior.
          </p>
        </div>
      )}

      {/* Estado actual */}
      {initialPosition !== null && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            <strong>Estado actual:</strong> Destacado en la posición {initialPosition}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Warning (swap) */}
      {warningMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">{warningMessage}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">
            {isFeatured
              ? `Producto marcado como destacado en posición ${position}`
              : "Producto eliminado de destacados"}
          </p>
        </div>
      )}

      {/* Botón Guardar */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
