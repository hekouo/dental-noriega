"use client";

import { useState } from "react";
import { updatePaymentStatusAdmin } from "@/lib/actions/shipping.admin";
import type { PaymentStatus } from "@/lib/orders/paymentStatus";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  currentStatus: string | null;
};

export default function UpdatePaymentStatusClient({
  orderId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>(
    (currentStatus as PaymentStatus) || "pending",
  );

  const handleUpdateStatus = async () => {
    setIsUpdating(true);
    setError(null);

    try {
      const result = await updatePaymentStatusAdmin(orderId, selectedStatus);

      if (!result.ok) {
        // Mapear códigos de error a mensajes
        const errorMessages: Record<string, string> = {
          "order-not-found": "Orden no encontrada",
          "fetch-error": "Error al obtener la orden",
          "update-error": "Error al actualizar el estado de pago",
          "invalid-status": "Estado de pago inválido",
          "config-error": "Error de configuración del servidor",
        };
        setError(errorMessages[result.code] || "Error al actualizar el estado");
        return;
      }

      // Refrescar la página para mostrar el nuevo estado
      router.refresh();
    } catch (err) {
      console.error("[UpdatePaymentStatusClient] Error:", err);
      setError("Error inesperado al actualizar el estado");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Cambiar estado de pago
        </p>
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex gap-3 items-center">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as PaymentStatus)}
            disabled={isUpdating}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="canceled">Cancelado</option>
          </select>
          <button
            type="button"
            onClick={handleUpdateStatus}
            disabled={isUpdating || currentStatus === selectedStatus}
            className="px-4 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUpdating ? "Actualizando..." : "Actualizar estado de pago"}
          </button>
        </div>
      </div>
    </div>
  );
}

