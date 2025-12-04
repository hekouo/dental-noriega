"use client";

import { useState } from "react";
import { updateShippingStatusAction } from "@/lib/actions/shipping.admin";
import type { ShippingStatus } from "@/lib/orders/shippingStatus";
import { getShippingStatusLabel } from "@/lib/orders/shippingStatus";

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
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdateStatus = async (newStatus: ShippingStatus) => {
    setIsUpdating(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateShippingStatusAction(orderId, newStatus);
      if (result.success) {
        setSuccess(true);
        // Recargar la página después de un breve delay para mostrar el mensaje
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setError(result.error || "Error al actualizar el estado");
      }
    } catch (err) {
      setError("Error inesperado al actualizar el estado");
      console.error("[UpdateShippingStatusClient] Error:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Determinar qué botones mostrar según el provider
  const isPickup = shippingProvider === "pickup";
  const isPaqueteria = shippingProvider === "skydropx" || (shippingProvider && shippingProvider !== "pickup" && shippingProvider !== "manual");

  if (!isPickup && !isPaqueteria) {
    return null; // No mostrar controles si no hay provider válido
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Cambiar estado de envío
      </h3>
      
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Estado actualizado correctamente. Recargando...
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {isPickup ? (
          <>
            {currentStatus !== "ready_for_pickup" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("ready_for_pickup")}
                disabled={isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isUpdating ? "Actualizando..." : "Marcar como listo para recoger"}
              </button>
            )}
            {currentStatus !== "delivered" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("delivered")}
                disabled={isUpdating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isUpdating ? "Actualizando..." : "Marcar como entregado"}
              </button>
            )}
            {currentStatus !== "canceled" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("canceled")}
                disabled={isUpdating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isUpdating ? "Actualizando..." : "Cancelar envío"}
              </button>
            )}
          </>
        ) : isPaqueteria ? (
          <>
            {currentStatus !== "in_transit" && currentStatus !== "created" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("in_transit")}
                disabled={isUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isUpdating ? "Actualizando..." : "Marcar como en tránsito"}
              </button>
            )}
            {currentStatus !== "delivered" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("delivered")}
                disabled={isUpdating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isUpdating ? "Actualizando..." : "Marcar como entregado"}
              </button>
            )}
            {currentStatus !== "canceled" && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("canceled")}
                disabled={isUpdating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {isUpdating ? "Actualizando..." : "Cancelar envío"}
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

