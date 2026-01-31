"use client";

import { useState } from "react";
import { updateShippingStatusAdmin } from "@/lib/actions/shipping.admin";
import type { ShippingStatus } from "@/lib/orders/shippingStatus";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  currentStatus: string | null;
  shippingProvider: string | null;
};

export default function UpdateShippingStatusClient({
  orderId,
  currentStatus,
  shippingProvider,
}: Props) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ShippingStatus | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const handleUpdateStatus = async (newStatus: ShippingStatus, reason?: string) => {
    setIsUpdating(true);
    setError(null);

    try {
      const result = await updateShippingStatusAdmin(orderId, newStatus, reason);

      if (!result.ok) {
        // Mapear códigos de error a mensajes
        const getErrorMessage = (code: string): string => {
          if (code === "order-not-found") {
            return "Orden no encontrada";
          }
          if (code === "fetch-error" || code === "update-error" || code === "config-error") {
            return "Error al obtener la orden";
          }
          return "Error al actualizar el estado";
        };
        setError(getErrorMessage(result.code));
        return;
      }

      // Refrescar la página para mostrar el nuevo estado
      setShowReasonInput(false);
      setPendingStatus(null);
      setOverrideReason("");
      router.refresh();
    } catch (err) {
      console.error("[UpdateShippingStatusClient] Error:", err);
      setError("Error inesperado al actualizar el estado");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusClick = (newStatus: ShippingStatus) => {
    // Si es Skydropx, mostrar input para reason opcional
    if (shippingProvider === "skydropx" || shippingProvider === "Skydropx") {
      setPendingStatus(newStatus);
      setShowReasonInput(true);
    } else {
      // Para otros proveedores, actualizar directamente sin reason
      handleUpdateStatus(newStatus);
    }
  };

  const handleConfirmWithReason = () => {
    if (pendingStatus) {
      handleUpdateStatus(pendingStatus, overrideReason.trim() || undefined);
    }
  };

  // Botones según el tipo de envío
  const isPickup = shippingProvider === "pickup";
  const isPaqueteria = shippingProvider === "skydropx" || shippingProvider === "manual";

  return (
    <div className="mt-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Cambiar estado de envío
          {(shippingProvider === "skydropx" || shippingProvider === "Skydropx") && (
            <span className="text-xs text-gray-500 ml-2">
              (Override manual - webhooks no cambiarán este estado)
            </span>
          )}
        </p>
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        
        {/* Input para reason cuando se muestra */}
        {showReasonInput && pendingStatus && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <label htmlFor="override-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Razón del cambio manual (opcional)
            </label>
            <input
              id="override-reason"
              type="text"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Ej: Cliente reportó entrega, corrección manual, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmWithReason}
                disabled={isUpdating}
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
              >
                {isUpdating ? "Actualizando..." : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReasonInput(false);
                  setPendingStatus(null);
                  setOverrideReason("");
                }}
                disabled={isUpdating}
                className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2">
          {isPickup && (
            <>
              <button
                type="button"
                onClick={() => handleStatusClick("ready_for_pickup")}
                disabled={isUpdating || currentStatus === "ready_for_pickup" || showReasonInput}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? "Actualizando..." : "Marcar como listo para recoger"}
              </button>
              <button
                type="button"
                onClick={() => handleStatusClick("delivered")}
                disabled={isUpdating || currentStatus === "delivered" || showReasonInput}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? "Actualizando..." : "Marcar como entregado"}
              </button>
            </>
          )}
          {isPaqueteria && (
            <>
              <button
                type="button"
                onClick={() => handleStatusClick("in_transit")}
                disabled={isUpdating || currentStatus === "in_transit" || showReasonInput}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? "Actualizando..." : "Marcar como en tránsito"}
              </button>
              <button
                type="button"
                onClick={() => handleStatusClick("delivered")}
                disabled={isUpdating || currentStatus === "delivered" || showReasonInput}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? "Actualizando..." : "Marcar como entregado"}
              </button>
            </>
          )}
          {(isPickup || isPaqueteria) && (
            <button
              type="button"
              onClick={() => handleStatusClick("cancelled")}
              disabled={isUpdating || currentStatus === "cancelled" || showReasonInput}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? "Actualizando..." : "Cancelar envío"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

