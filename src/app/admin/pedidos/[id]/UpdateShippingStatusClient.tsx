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

  const handleUpdateStatus = async (newStatus: ShippingStatus) => {
    setIsUpdating(true);
    setError(null);

    try {
      const result = await updateShippingStatusAdmin(orderId, newStatus);

      if (!result.ok) {
        // Mapear códigos de error a mensajes
        const errorMessages: Record<string, string> = {
          "order-not-found": "Orden no encontrada",
          "fetch-error": "Error al obtener la orden",
          "update-error": "Error al actualizar el estado de envío",
          "invalid-status": "Estado de envío inválido",
          "config-error": "Error de configuración del servidor",
        };
        setError(errorMessages[result.code] || "Error al actualizar el estado");
        return;
      }

      // Refrescar la página para mostrar el nuevo estado
      router.refresh();
    } catch (err) {
      console.error("[UpdateShippingStatusClient] Error:", err);
      setError("Error inesperado al actualizar el estado");
    } finally {
      setIsUpdating(false);
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
        </p>
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {isPickup && (
            <>
              <button
                type="button"
                onClick={() => handleUpdateStatus("ready_for_pickup")}
                disabled={isUpdating || currentStatus === "ready_for_pickup"}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? "Actualizando..." : "Marcar como listo para recoger"}
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("delivered")}
                disabled={isUpdating || currentStatus === "delivered"}
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
                onClick={() => handleUpdateStatus("in_transit")}
                disabled={isUpdating || currentStatus === "in_transit"}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? "Actualizando..." : "Marcar como en tránsito"}
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus("delivered")}
                disabled={isUpdating || currentStatus === "delivered"}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdating ? "Actualizando..." : "Marcar como entregado"}
              </button>
            </>
          )}
          {(isPickup || isPaqueteria) && (
            <button
              type="button"
              onClick={() => handleUpdateStatus("canceled")}
              disabled={isUpdating || currentStatus === "canceled"}
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

