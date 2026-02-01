"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
};

const CONFIRM_PREFIX = "BORRAR ";

export default function DeleteOrderClient({ orderId }: Props) {
  const router = useRouter();
  const [understood, setUnderstood] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [force, setForce] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expectedConfirm = CONFIRM_PREFIX + orderId;
  const confirmValid = confirmText.trim() === expectedConfirm;
  const reasonValid = !force || reason.trim().length >= 5;
  const canDelete = understood && confirmValid && reasonValid;

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          force,
          reason: force ? reason.trim() : undefined,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        if (data.code === "protected-order") {
          if (data.reason === "paid") {
            setError("Esta orden está pagada. Activa \"Forzar\" y escribe una razón para borrarla.");
          } else {
            setError("Esta orden tiene guía creada. Activa \"Forzar\" y escribe una razón para borrarla.");
          }
        } else {
          setError(data.message || "Error al eliminar la orden");
        }
        return;
      }

      router.push("/admin/pedidos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 py-6 border-t border-red-200 bg-red-50/50">
      <h2 className="text-lg font-semibold text-red-800 mb-2">Eliminar pedido</h2>
      <p className="text-sm text-gray-700 mb-4">
        Esta acción borra la orden y sus items de forma permanente. No se puede deshacer.
      </p>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">ID de la orden</p>
          <p className="font-mono text-sm text-gray-900 break-all bg-white px-2 py-1 rounded border border-gray-200">
            {orderId}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="delete-understood"
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="delete-understood" className="text-sm text-gray-700">
            Entiendo que esto borra el pedido permanentemente
          </label>
        </div>

        <div>
          <label htmlFor="delete-confirm" className="block text-sm font-medium text-gray-700 mb-1">
            Escribe <strong>{CONFIRM_PREFIX.trim()}</strong> seguido del ID para confirmar
          </label>
          <input
            id="delete-confirm"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`${CONFIRM_PREFIX}${orderId.slice(0, 8)}…`}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-sm"
            aria-label="Confirmación: BORRAR seguido del ID"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="delete-force"
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="delete-force" className="text-sm text-gray-700">
            Forzar (permitir borrar pagadas / con guía)
          </label>
        </div>

        {force && (
          <div>
            <label htmlFor="delete-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Razón del borrado forzado (mínimo 5 caracteres)
            </label>
            <input
              id="delete-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: orden de prueba, duplicado, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
              minLength={5}
            />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={!canDelete || loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Eliminando…" : "Eliminar pedido"}
        </button>
      </div>
    </div>
  );
}
