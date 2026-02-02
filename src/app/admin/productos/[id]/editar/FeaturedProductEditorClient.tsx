"use client";

import { useState, useEffect, useCallback } from "react";

type SlotInfo = {
  position: number;
  product_id: string | null;
  title: string | null;
  sku: string | null;
  slug: string | null;
};

type FeaturedProductEditorClientProps = {
  productSlug: string;
  productTitle: string;
  initialPosition: number | null;
};

export default function FeaturedProductEditorClient({
  productSlug,
  productTitle,
  initialPosition,
}: FeaturedProductEditorClientProps) {
  const [isFeatured, setIsFeatured] = useState<boolean>(initialPosition !== null);
  const [position, setPosition] = useState<string>(
    initialPosition !== null ? String(initialPosition) : "0",
  );
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const res = await fetch("/api/admin/products/featured");
      const data = await res.json();
      if (data.ok && Array.isArray(data.slots)) {
        setSlots(data.slots);
      }
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const getSlotLabel = (pos: number) => {
    const slot = slots.find((s) => s.position === pos);
    if (!slot || !slot.product_id) return `Slot ${pos} (vacío)`;
    const label = slot.title?.trim() || slot.sku || slot.slug || "—";
    return `Slot ${pos} (ocupado: ${label})`;
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setWarningMessage(null);

    try {
      const positionValue = isFeatured ? parseInt(position, 10) : undefined;
      if (isFeatured && (isNaN(positionValue!) || positionValue! < 0 || positionValue! > 7)) {
        setError("La posición debe ser un número entre 0 y 7.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/products/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug,
          enabled: isFeatured,
          position: isFeatured ? positionValue : undefined,
          reason: isFeatured ? `Marcar como destacado en posición ${positionValue}` : "Quitar de destacados",
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        const msg = data.message || "Error al guardar cambios";
        const details = data.details ? ` (${data.details})` : "";
        setError(msg + details);
        setLoading(false);
        return;
      }

      if (data.action === "upserted" && data.previousSlug) {
        setWarningMessage(
          `Se reemplazó el producto anterior (${data.previousSlug}) en la posición ${data.position}.`,
        );
      }

      setSuccess(true);
      await fetchSlots();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error("[FeaturedProductEditorClient] Error:", err);
      setError("Error de red al guardar cambios.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setWarningMessage(null);
    try {
      const res = await fetch("/api/admin/products/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSlug, enabled: false, reason: "Quitar de destacados" }),
      });
      const data = await res.json();
      if (!data.ok) {
        const msg = data.message || "Error al quitar de destacados";
        const details = data.details ? ` (${data.details})` : "";
        setError(msg + details);
        setLoading(false);
        return;
      }
      setSuccess(true);
      setIsFeatured(false);
      await fetchSlots();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error("[FeaturedProductEditorClient] Error:", err);
      setError("Error de red.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold">Producto destacado</h3>
      <p className="text-sm text-gray-600">
        Los productos destacados aparecen en la página de inicio (8 slots: 0-7).
      </p>

      {/* Estado actual */}
      {initialPosition !== null ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            <strong>Estado actual:</strong> Este producto está en el slot {initialPosition}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-gray-700">No está destacado</p>
        </div>
      )}

      {/* Tabla de slots 0..7 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Slots (0-7)</h4>
        {slotsLoading ? (
          <p className="text-sm text-gray-500">Cargando slots…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Slot</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Producto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((pos) => {
                  const slot = slots.find((s) => s.position === pos);
                  const occupied = slot?.product_id && (slot.title || slot.sku || slot.slug);
                  const isThisProduct = slot?.slug === productSlug;
                  return (
                    <tr key={pos} className={isThisProduct ? "bg-primary-50" : ""}>
                      <td className="px-3 py-2 font-medium">{pos}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {occupied ? (
                          <>
                            {slot!.title || slot!.sku || slot!.slug}
                            {isThisProduct && " (este producto)"}
                          </>
                        ) : (
                          <span className="italic text-gray-400">Vacío</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                {getSlotLabel(slot)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Si el slot está ocupado, se reemplazará el producto anterior.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {warningMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">{warningMessage}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">
            {isFeatured
              ? `Producto marcado como destacado en posición ${position}`
              : "Producto eliminado de destacados"}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? "Guardando…" : "Guardar cambios"}
        </button>
        {initialPosition !== null && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={loading}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50 text-sm font-medium"
          >
            Quitar de destacados
          </button>
        )}
      </div>
    </div>
  );
}
