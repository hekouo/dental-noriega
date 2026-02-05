"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
};

const CONFIRM_PREFIX = "RESET COTIZACION ";

export default function ResetQuoteClient({ orderId }: Props) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [force, setForce] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const expectedConfirm = CONFIRM_PREFIX + orderId;
  const confirmValid = confirmText.trim() === expectedConfirm;
  const reasonValid = !force || reason.trim().length >= 5;
  const canSubmit = confirmValid && reasonValid;

  const handleReset = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/shipping/reset-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          confirm: confirmText.trim(),
          force: force || undefined,
          reason: force ? reason.trim() : undefined,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        if (data.code === "confirm_mismatch") {
          setError("La confirmación no coincide. Escribe exactamente: RESET COTIZACION seguido del ID.");
        } else if (data.code === "has_shipment") {
          setError("No se puede resetear porque ya tiene guía. Activa FORZAR y escribe una razón.");
        } else if (data.code === "force_requires_reason") {
          setError("Si activas FORZAR, debes indicar una razón (mínimo 5 caracteres).");
        } else {
          setError(data.message || "Error al resetear cotización");
        }
        return;
      }

      setSuccess("Cotización reseteada. Puedes recotizar con la política actual (standard_box 25×20×15).");
      setConfirmText("");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-6 border-t border-amber-200 bg-amber-50/50">
      <h2 className="text-lg font-semibold text-amber-900 mb-2">Reset cotización (Skydropx)</h2>
      <p className="text-sm text-gray-700 mb-4">
        Esto eliminará la cotización guardada para forzar recotización. No cancela guías ni borra tracking.
      </p>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">ID de la orden</p>
          <p className="font-mono text-sm text-gray-900 break-all bg-white px-2 py-1 rounded border border-gray-200">
            {orderId}
          </p>
        </div>

        <div>
          <label htmlFor="reset-quote-confirm" className="block text-sm font-medium text-gray-700 mb-1">
            Escribe <strong>RESET COTIZACION</strong> seguido del ID para confirmar
          </label>
          <input
            id="reset-quote-confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`${CONFIRM_PREFIX}${orderId.slice(0, 8)}…`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono text-sm"
            aria-label="Confirmación: RESET COTIZACION seguido del ID"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="reset-quote-force"
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <label htmlFor="reset-quote-force" className="text-sm text-gray-700">
            FORZAR (aunque tenga guía)
          </label>
        </div>

        {force && (
          <div>
            <label htmlFor="reset-quote-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Razón (obligatorio si FORZAR, mínimo 5 caracteres)
            </label>
            <input
              id="reset-quote-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: recotizar con dims actuales"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm"
              minLength={5}
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-100 border border-green-200 rounded-lg text-sm text-green-800">
            {success}
          </div>
        )}

        <button
          type="button"
          onClick={handleReset}
          disabled={!canSubmit || loading}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Reseteando…" : "Reset cotización (Skydropx)"}
        </button>
      </div>
    </div>
  );
}
