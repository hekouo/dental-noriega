"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CleanupMode = "cancelled" | "abandoned" | "both" | "unpaid_any_age" | "bank_transfer_test";

type DryRunResult = {
  ok: true;
  dryRun: true;
  ordersToDelete: number;
  orderItemsToDelete: number;
  sampleOrderIds: string[];
};

type ExecuteResult = {
  ok: true;
  dryRun: false;
  ordersDeleted: number;
  orderItemsDeleted: number;
};

type ErrorResult = {
  ok: false;
  code: string;
  message: string;
};

type CleanupResponse = DryRunResult | ExecuteResult | ErrorResult;

export default function OrderCleanupPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<CleanupMode>("abandoned");
  const [olderThanDaysStr, setOlderThanDaysStr] = useState("14");
  const [dryRun, setDryRun] = useState(true);
  const [excludeWithShipmentId, setExcludeWithShipmentId] = useState(true);
  const [allowDeletePaidForBankTransferTest, setAllowDeletePaidForBankTransferTest] = useState(false);
  const [bankTransferReason, setBankTransferReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CleanupResponse | null>(null);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executeConfirm, setExecuteConfirm] = useState("");

  const runCleanup = async (actuallyExecute: boolean) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/orders/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          mode,
          olderThanDays: Math.min(365, Math.max(1, parseInt(olderThanDaysStr, 10) || 14)),
          dryRun: !actuallyExecute,
          excludeWithShipmentId,
          ...(mode === "bank_transfer_test" && {
            allowDeletePaidForBankTransferTest,
            reason: allowDeletePaidForBankTransferTest ? bankTransferReason.trim() : undefined,
          }),
        }),
      });
      const data: CleanupResponse = await res.json();
      setResult(data);
      if (data.ok && !data.dryRun) {
        setShowExecuteModal(false);
        setExecuteConfirm("");
        router.refresh();
      }
    } catch (err) {
      setResult({
        ok: false,
        code: "unknown_error",
        message: err instanceof Error ? err.message : "Error de red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDryRun = () => runCleanup(false);

  const handleOpenExecuteModal = () => {
    if (dryRun) return;
    setResult(null);
    setExecuteConfirm("");
    setShowExecuteModal(true);
  };

  const handleExecute = () => {
    if (executeConfirm !== "BORRAR") return;
    runCleanup(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Limpieza de órdenes (basura)
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Borrar órdenes canceladas o abandonadas (nunca se borran órdenes pagadas).
        Por defecto es simulación (dry run).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label
            htmlFor="cleanup-mode"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Modo
          </label>
          <select
            id="cleanup-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as CleanupMode)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="cancelled">Solo canceladas</option>
            <option value="abandoned">Solo abandonadas (&gt; N días)</option>
            <option value="both">Ambas</option>
            <option value="unpaid_any_age">No pagadas (cualquier edad)</option>
            <option value="bank_transfer_test">Transferencias de prueba</option>
          </select>
        </div>

        {mode === "bank_transfer_test" && (
          <div className="md:col-span-2">
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Este modo puede borrar órdenes marcadas pagadas manualmente para pruebas.
            </p>
          </div>
        )}

        {mode !== "unpaid_any_age" && (
          <div>
            <label
              htmlFor="cleanup-days"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Más antiguas que (días)
            </label>
            <input
              id="cleanup-days"
              type="number"
              min={1}
              max={365}
              value={olderThanDaysStr}
              onChange={(e) => setOlderThanDaysStr(e.target.value)}
              onBlur={() => {
                const n = parseInt(olderThanDaysStr, 10);
                if (isNaN(n) || n < 1) setOlderThanDaysStr("1");
                else if (n > 365) setOlderThanDaysStr("365");
                else setOlderThanDaysStr(String(n));
              }}
              placeholder="14"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        )}

        {mode === "bank_transfer_test" && (
          <>
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                id="cleanup-allow-delete-paid"
                type="checkbox"
                checked={allowDeletePaidForBankTransferTest}
                onChange={(e) => setAllowDeletePaidForBankTransferTest(e.target.checked)}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="cleanup-allow-delete-paid" className="text-sm text-gray-700">
                Permitir borrar aunque estén pagadas (solo transferencias)
              </label>
            </div>
            {allowDeletePaidForBankTransferTest && (
              <div className="md:col-span-2">
                <label
                  htmlFor="cleanup-bank-reason"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Razón (mínimo 10 caracteres)
                </label>
                <input
                  id="cleanup-bank-reason"
                  type="text"
                  value={bankTransferReason}
                  onChange={(e) => setBankTransferReason(e.target.value)}
                  placeholder="Ej: órdenes de prueba marcadas pagadas manualmente"
                  minLength={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-2">
          <input
            id="cleanup-dryrun"
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="cleanup-dryrun" className="text-sm text-gray-700">
            Simulación (dry run) — no borra nada
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="cleanup-exclude-shipment"
            type="checkbox"
            checked={excludeWithShipmentId}
            onChange={(e) => setExcludeWithShipmentId(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="cleanup-exclude-shipment" className="text-sm text-gray-700">
            Excluir órdenes con guía creada (shipping_shipment_id)
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleDryRun}
          disabled={loading}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Consultando…" : "Vista previa (dry run)"}
        </button>
        {!dryRun && (
          <button
            type="button"
            onClick={handleOpenExecuteModal}
            disabled={
              loading ||
              (mode === "bank_transfer_test" &&
                allowDeletePaidForBankTransferTest &&
                bankTransferReason.trim().length < 10)
            }
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Ejecutar borrado
          </button>
        )}
      </div>

      {/* Resultado */}
      {result && (
        <div
          className={`mt-4 p-4 rounded-lg border ${
            result.ok
              ? result.dryRun
                ? "bg-blue-50 border-blue-200 text-blue-900"
                : "bg-green-50 border-green-200 text-green-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          {result.ok ? (
            result.dryRun ? (
              <>
                <p className="font-medium">
                  Vista previa: {result.ordersToDelete} órdenes,{" "}
                  {result.orderItemsToDelete} items a borrar.
                </p>
                {result.sampleOrderIds.length > 0 && (
                  <p className="text-sm mt-1 font-mono truncate">
                    Ejemplo IDs: {result.sampleOrderIds.slice(0, 5).join(", ")}
                    {result.sampleOrderIds.length > 5 && " …"}
                  </p>
                )}
              </>
            ) : (
              <p className="font-medium">
                Hecho: {result.ordersDeleted} órdenes y {result.orderItemsDeleted}{" "}
                items borrados.
              </p>
            )
          ) : (
            <p className="font-medium">
              Error: {result.message} ({result.code})
            </p>
          )}
        </div>
      )}

      {/* Modal de confirmación para ejecutar */}
      {showExecuteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="execute-modal-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 id="execute-modal-title" className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar borrado
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Esto borrará órdenes y sus items de forma permanente. Escribe{" "}
              <strong>BORRAR</strong> para confirmar.
            </p>
            <input
              type="text"
              value={executeConfirm}
              onChange={(e) => setExecuteConfirm(e.target.value)}
              placeholder="BORRAR"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 mb-4"
              aria-label="Escribe BORRAR para confirmar"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowExecuteModal(false);
                  setExecuteConfirm("");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecute}
                disabled={executeConfirm !== "BORRAR" || loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Borrando…" : "Borrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
