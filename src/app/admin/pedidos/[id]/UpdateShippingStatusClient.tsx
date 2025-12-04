"use client";

import { useState } from "react";
import { updateShippingStatusAdmin } from "@/lib/actions/shipping.admin";
import type { ShippingStatus } from "@/lib/orders/shippingStatus";
import { SHIPPING_STATUS_LABELS } from "@/lib/orders/shippingStatus";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  currentStatus: string | null;
  shippingProvider?: string | null;
};

const ALL_STATUSES: ShippingStatus[] = [
  "pending",
  "created",
  "in_transit",
  "ready_for_pickup",
  "delivered",
  "canceled",
];

export default function UpdateShippingStatusClient({
  orderId,
  currentStatus,
  shippingProvider: _shippingProvider,
}: Props) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<ShippingStatus>(
    (currentStatus as ShippingStatus) || "pending"
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateShippingStatusAdmin(orderId, selectedStatus);

      if (!result.success) {
        setError(result.error || "Error al actualizar el estado");
        return;
      }

      setSuccess(true);
      // Refrescar la página para mostrar el nuevo estado
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      console.error("[UpdateShippingStatusClient] Error:", err);
      setError("Error inesperado al actualizar el estado");
    } finally {
      setIsUpdating(false);
    }
  };

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
        {success && (
          <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            Estado actualizado correctamente
          </div>
        )}
        <form onSubmit={handleUpdateStatus} className="space-y-3">
          <div>
            <label
              htmlFor="shipping-status-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Estado actual:{" "}
              <span className="font-semibold">
                {SHIPPING_STATUS_LABELS[(currentStatus as ShippingStatus) || "pending"]}
              </span>
            </label>
            <select
              id="shipping-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ShippingStatus)}
              disabled={isUpdating}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SHIPPING_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isUpdating || selectedStatus === currentStatus}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isUpdating ? "Actualizando..." : "Actualizar estado de envío"}
          </button>
        </form>
      </div>
    </div>
  );
}

