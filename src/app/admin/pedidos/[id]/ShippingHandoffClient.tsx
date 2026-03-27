"use client";

import { useMemo, useState } from "react";

type Handoff = {
  mode?: "dropoff" | "pickup";
  selected_at?: string;
  notes?: string;
  dropoff?: {
    status?: "pending_dropoff" | "dropped_off";
    location_name?: string;
    address?: string;
    dropped_off_at?: string;
  };
  pickup?: {
    pickup_id?: string;
    scheduled_from?: string;
    scheduled_to?: string;
    packages?: number;
    total_weight_kg?: number;
    status?: "scheduled";
    raw?: Record<string, unknown>;
  };
};

type Props = {
  orderId: string;
  labelUrl: string | null;
  trackingNumber: string | null;
  initialHandoff: Handoff | null;
  initialWeightKg: number;
};

export default function ShippingHandoffClient({
  orderId,
  labelUrl,
  trackingNumber,
  initialHandoff,
  initialWeightKg,
}: Props) {
  const [handoff, setHandoff] = useState<Handoff>(initialHandoff ?? {});
  const [notes, setNotes] = useState<string>(initialHandoff?.notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [pickupDate, setPickupDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [pickupFrom, setPickupFrom] = useState<string>("08:00");
  const [pickupTo, setPickupTo] = useState<string>("17:00");
  const [pickupPackages, setPickupPackages] = useState<number>(1);
  const [pickupWeightKg, setPickupWeightKg] = useState<number>(
    initialHandoff?.pickup?.total_weight_kg ?? Math.max(0.1, initialWeightKg || 1),
  );

  const dropoffStatus = handoff.dropoff?.status ?? null;
  const hasPickupProgrammed = !!handoff.pickup?.pickup_id;
  const pickupId = handoff.pickup?.pickup_id ?? null;
  const badge = useMemo(() => {
    if (dropoffStatus === "dropped_off") {
      return { label: "Entregado en sucursal", cls: "bg-green-100 text-green-700" };
    }
    if (dropoffStatus === "pending_dropoff") {
      return { label: "Pendiente de entrega en sucursal", cls: "bg-amber-100 text-amber-800" };
    }
    if (hasPickupProgrammed) {
      return { label: "Recolección programada", cls: "bg-blue-100 text-blue-700" };
    }
    return null;
  }, [dropoffStatus, hasPickupProgrammed]);

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
  const isPickupSelected = handoff.mode === "pickup";

  const applyDefaultWindowByDate = (dateValue: string) => {
    if (!dateValue) return;
    const day = new Date(`${dateValue}T12:00:00`).getDay();
    if (day >= 1 && day <= 5) {
      setPickupFrom("08:00");
      setPickupTo("17:00");
      return;
    }
    if (day === 6) {
      setPickupFrom("08:00");
      setPickupTo("15:00");
    }
  };

  const handlePickupDateChange = (nextDate: string) => {
    setPickupDate(nextDate);
    applyDefaultWindowByDate(nextDate);
  };

  const handleProgramPickup = async () => {
    const day = new Date(`${pickupDate}T12:00:00`).getDay();
    if (day === 0) {
      setError("Domingo no disponible");
      setStatus("error");
      return;
    }
    const fromIso = new Date(`${pickupDate}T${pickupFrom}:00`).toISOString();
    const toIso = new Date(`${pickupDate}T${pickupTo}:00`).toISOString();
    if (new Date(toIso).getTime() <= new Date(fromIso).getTime()) {
      setError("La hora final debe ser mayor a la inicial.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/admin/shipping/skydropx/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          scheduled_from: fromIso,
          scheduled_to: toIso,
          packages: pickupPackages,
          total_weight_kg: pickupWeightKg,
          notes: notes.trim() || undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        pickup_id?: string;
        scheduled_from?: string;
        scheduled_to?: string;
        packages?: number;
        total_weight_kg?: number;
      };
      if (!res.ok || !json.ok) {
        setStatus("error");
        setError(json.message ?? "No se pudo programar pickup.");
        return;
      }
      const now = new Date().toISOString();
      setHandoff((prev) => ({
        ...prev,
        mode: "pickup",
        selected_at: now,
        notes: notes.trim() || undefined,
        pickup: {
          pickup_id: json.pickup_id,
          scheduled_from: json.scheduled_from,
          scheduled_to: json.scheduled_to,
          packages: json.packages,
          total_weight_kg: json.total_weight_kg,
          status: "scheduled",
        },
      }));
      setStatus("idle");
    } catch {
      setStatus("error");
      setError("Error de conexión.");
    }
  };

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

        <div className={`rounded-lg border p-4 ${isPickupSelected ? "border-primary-300 bg-primary-50/40" : "border-gray-200"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm text-gray-900">Programar recolección (Pickup)</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Recolección a domicilio en origen fijo del negocio.
              </p>
            </div>
            <button
              type="button"
              onClick={handleProgramPickup}
              disabled={status === "saving" || hasPickupProgrammed}
              className="px-3 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 focus-premium"
            >
              Programar recolección
            </button>
          </div>
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

      {/* Detalles pickup */}
      {(isPickupSelected || hasPickupProgrammed) && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          {hasPickupProgrammed ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">Recolección programada</p>
              <p>
                <span className="text-gray-600">Pickup ID:</span>{" "}
                <span className="font-mono text-xs">{pickupId}</span>
              </p>
              <p>
                <span className="text-gray-600">Ventana:</span>{" "}
                {handoff.pickup?.scheduled_from ? new Date(handoff.pickup.scheduled_from).toLocaleString("es-MX") : "—"}
                {" — "}
                {handoff.pickup?.scheduled_to ? new Date(handoff.pickup.scheduled_to).toLocaleString("es-MX") : "—"}
              </p>
              <p>
                <span className="text-gray-600">Paquetes/Peso:</span>{" "}
                {handoff.pickup?.packages ?? 1} paquete(s), {handoff.pickup?.total_weight_kg ?? 0} kg
              </p>
              <p className="text-xs text-gray-500">Reprogramar: disponible pronto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => handlePickupDateChange(e.target.value)}
                    disabled={status === "saving"}
                    className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus-premium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora desde</label>
                  <input
                    type="time"
                    value={pickupFrom}
                    onChange={(e) => setPickupFrom(e.target.value)}
                    disabled={status === "saving"}
                    className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus-premium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora hasta</label>
                  <input
                    type="time"
                    value={pickupTo}
                    onChange={(e) => setPickupTo(e.target.value)}
                    disabled={status === "saving"}
                    className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus-premium"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1"># paquetes</label>
                  <input
                    type="number"
                    min={1}
                    value={pickupPackages}
                    onChange={(e) => setPickupPackages(Math.max(1, Number(e.target.value) || 1))}
                    disabled={status === "saving"}
                    className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus-premium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso total (kg)</label>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={pickupWeightKg}
                    onChange={(e) => setPickupWeightKg(Math.max(0.1, Number(e.target.value) || 0.1))}
                    disabled={status === "saving"}
                    className="w-full rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus-premium"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Defaults: L-V 08:00-17:00, Sábado 08:00-15:00, Domingo no disponible.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

