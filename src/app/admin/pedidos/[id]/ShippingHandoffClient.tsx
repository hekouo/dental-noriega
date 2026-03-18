"use client";

import { useMemo, useState } from "react";

type Handoff = {
  mode?: "dropoff";
  selected_at?: string;
  notes?: string;
  dropoff?: {
    status?: "pending_dropoff" | "dropped_off";
    location_name?: string;
    address?: string;
    dropped_off_at?: string;
  };
};

type Props = {
  orderId: string;
  labelUrl: string | null;
  trackingNumber: string | null;
  initialHandoff: Handoff | null;
};

export default function ShippingHandoffClient({
  orderId,
  labelUrl,
  trackingNumber,
  initialHandoff,
}: Props) {
  const [handoff, setHandoff] = useState<Handoff>(initialHandoff ?? {});
  const [notes, setNotes] = useState<string>(initialHandoff?.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string>("");

  const dropoffStatus = handoff.dropoff?.status ?? null;
  const badge = useMemo(() => {
    if (dropoffStatus === "dropped_off") {
      return { label: "Entregado en sucursal", cls: "bg-green-100 text-green-700" };
    }
    if (dropoffStatus === "pending_dropoff") {
      return { label: "Pendiente de entrega en sucursal", cls: "bg-amber-100 text-amber-800" };
    }
    return null;
  }, [dropoffStatus]);

  const patch = async (shipping_handoff_patch: Record<string, unknown>) => {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/metadata`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipping_handoff_patch }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setStatus("error");
        setError(json.message ?? "No se pudo guardar.");
        return false;
      }
      setStatus("idle");
      return true;
    } catch {
      setStatus("error");
      setError("Error de conexión.");
      return false;
    }
  };

  const handleUseDropoff = async () => {
    const now = new Date().toISOString();
    const ok = await patch({
      mode: "dropoff",
      selected_at: now,
      dropoff: { status: "pending_dropoff" },
    });
    if (!ok) return;
    setHandoff((prev) => ({
      ...prev,
      mode: "dropoff",
      selected_at: now,
      dropoff: { ...(prev.dropoff ?? {}), status: "pending_dropoff" },
    }));
  };

  const handleSaveNotes = async () => {
    const ok = await patch({ notes: notes.trim() || null });
    if (!ok) return;
    setHandoff((prev) => ({ ...prev, notes: notes.trim() || undefined }));
  };

  const handleDroppedOff = async () => {
    const now = new Date().toISOString();
    const ok = await patch({
      dropoff: { status: "dropped_off", dropped_off_at: now },
    });
    if (!ok) return;
    setHandoff((prev) => ({
      ...prev,
      dropoff: { ...(prev.dropoff ?? {}), status: "dropped_off", dropped_off_at: now },
    }));
  };

  const isDropoffSelected = handoff.mode === "dropoff";

  return (
    <section className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-md font-semibold">Entrega del paquete</h3>
          <p className="text-sm text-gray-600 mt-1">
            Define cómo se entregará el paquete a la paquetería una vez creada la guía.
          </p>
        </div>
        {badge && (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`rounded-lg border p-4 ${isDropoffSelected ? "border-primary-300 bg-primary-50/40" : "border-gray-200"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm text-gray-900">Lo entregaré en sucursal (Drop-off)</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Entregas el paquete en la sucursal indicada por la paquetería.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUseDropoff}
              disabled={status === "saving"}
              className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 focus-premium"
            >
              Usar Drop-off
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4 opacity-60">
          <p className="font-semibold text-sm text-gray-900">Programar recolección (Pickup)</p>
          <p className="text-xs text-gray-600 mt-0.5">Disponible pronto.</p>
        </div>
      </div>

      {/* Detalles drop-off */}
      {isDropoffSelected && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600">Tracking</p>
              <p className="font-mono text-xs">{trackingNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-600">Guía</p>
              {labelUrl ? (
                <a
                  href={labelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline font-medium"
                >
                  Abrir guía
                </a>
              ) : (
                <p>—</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="handoff-notes">
              Notas / Sucursal (opcional)
            </label>
            <textarea
              id="handoff-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={status === "saving"}
              className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus-premium resize-y disabled:opacity-50"
              placeholder="Ej. Sucursal X / horario / referencia…"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={status === "saving"}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 focus-premium"
              >
                Guardar notas
              </button>
              <button
                type="button"
                onClick={handleDroppedOff}
                disabled={status === "saving" || dropoffStatus === "dropped_off"}
                className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 focus-premium"
              >
                Marcar como entregado en sucursal
              </button>
              {status === "error" && (
                <span className="text-sm text-red-600">{error}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

