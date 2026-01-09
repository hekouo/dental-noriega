"use client";

import { useState } from "react";
import { Loader2, XCircle, AlertTriangle } from "lucide-react";

/**
 * Obtiene el mensaje de error para cancelación según el código
 */
function getCancelErrorMessage(code: string | undefined, defaultMessage: string | undefined): string {
  if (code === "unauthorized") {
    return "No tienes permisos para realizar esta acción.";
  }
  if (code === "order_not_found") {
    return "La orden no existe.";
  }
  if (code === "no_label_created") {
    return "La orden no tiene una guía creada para cancelar.";
  }
  if (code === "missing_shipment_id") {
    return "La orden tiene tracking pero falta shipment_id. Sincroniza la guía primero usando 'Sincronizar guía' para poder cancelar el envío.";
  }
  if (code === "skydropx_error") {
    return "Error al cancelar en Skydropx. Revisa los logs.";
  }
  return defaultMessage || "Error desconocido al cancelar el envío.";
}

type Props = {
  orderId: string;
  shippingStatus: string | null;
  shippingProvider: string | null;
  hasTracking: boolean;
  hasShipmentId: boolean;
  onSuccess?: () => void;
};

export default function CancelSkydropxLabelClient({
  orderId,
  shippingStatus,
  shippingProvider,
  hasTracking,
  hasShipmentId,
  onSuccess,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Verificar si se puede cancelar (requiere shipment_id, label_created, y tracking)
  const canCancel =
    shippingStatus === "label_created" &&
    (shippingProvider === "skydropx" || shippingProvider === "Skydropx") &&
    hasTracking &&
    hasShipmentId; // REQUERIDO: shipment_id debe estar presente

  // Verificar si falta shipment_id pero hay tracking (necesita sincronización)
  const needsSync = hasTracking && !hasShipmentId && shippingStatus === "label_created";

  // Verificar si ya está en proceso de cancelación
  const isCancelRequested = shippingStatus === "cancel_requested";

  // Si necesita sincronización, mostrar mensaje con botón
  if (needsSync) {
    const handleSync = async () => {
      setIsSyncing(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/shipping/skydropx/sync-label", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ orderId }),
        });

        const data = await response.json();

        if (!data.ok) {
          setError(
            data.code === "missing_shipment_id"
              ? "No se pudo sincronizar: falta shipment_id en Skydropx."
              : data.message || "Error al sincronizar la guía.",
          );
          return;
        }

        // Si se sincronizó exitosamente, recargar página para actualizar estado
        window.location.reload();
      } catch (err) {
        console.error("[CancelSkydropxLabelClient] Error al sincronizar:", err);
        setError("Error de red al sincronizar la guía. Intenta de nuevo.");
      } finally {
        setIsSyncing(false);
      }
    };

    return (
      <div className="mt-4">
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
                Falta sincronizar guía
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                Hay tracking pero falta shipment_id. Sincroniza la guía para poder cancelar/descargar etiqueta.
              </p>
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Sincronizar guía
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Si ya está cancelada o no se puede cancelar, no mostrar nada
  if (!canCancel && !isCancelRequested) {
    return null;
  }

  // Si ya está en proceso de cancelación, mostrar estado
  if (isCancelRequested) {
    return (
      <div className="mt-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Cancelación en proceso
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                La solicitud de cancelación está siendo revisada por Skydropx. El estado se
                actualizará automáticamente cuando se confirme.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/shipping/skydropx/cancel-label", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();

      if (!data.ok) {
        const errorMessage = getCancelErrorMessage(data.code, data.message);

        setError(errorMessage);
        setShowConfirm(false);
        return;
      }

      // Llamar callback si existe
      if (onSuccess) {
        onSuccess();
      }

      // Recargar la página para actualizar datos del servidor
      window.location.reload();
    } catch (err) {
      console.error("[CancelSkydropxLabelClient] Error:", err);
      setError("Error de red al cancelar el envío. Intenta de nuevo.");
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showConfirm) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          <XCircle className="w-4 h-4" />
          Cancelar envío
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
              Confirmar cancelación
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
              ¿Estás seguro de que deseas cancelar este envío? Esta acción cambiará el estado a
              "cancelado" y no se podrá revertir automáticamente.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Sí, cancelar
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setError(null);
                }}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}

