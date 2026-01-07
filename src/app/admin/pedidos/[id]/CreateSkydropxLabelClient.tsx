"use client";

import { useState } from "react";
import { Loader2, Package, ExternalLink, Download } from "lucide-react";

type Props = {
  orderId: string;
  paymentStatus: string | null;
  shippingProvider: string | null;
  shippingRateExtId: string | null;
  shippingStatus: string | null;
  currentTrackingNumber: string | null;
  currentLabelUrl: string | null;
  onSuccess?: (data: { trackingNumber: string; labelUrl: string | null }) => void;
};

export default function CreateSkydropxLabelClient({
  orderId,
  paymentStatus,
  shippingProvider,
  shippingRateExtId,
  shippingStatus,
  currentTrackingNumber,
  currentLabelUrl,
  onSuccess,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(currentTrackingNumber);
  const [labelUrl, setLabelUrl] = useState<string | null>(currentLabelUrl);

  // Verificar si ya tiene label creada
  const hasLabelCreated = shippingStatus === "label_created" && currentLabelUrl;

  // Verificar si se puede crear guía (solo si NO tiene label_created)
  const canCreateLabel =
    !hasLabelCreated &&
    paymentStatus === "paid" &&
    (shippingProvider === "skydropx" || shippingProvider === "Skydropx") &&
    shippingRateExtId &&
    !trackingNumber;

  const handleCreateLabel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/shipping/skydropx/create-label", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

          const data = await response.json();

      if (!data.ok) {
        const errorMessage =
          data.code === "payment_not_paid"
            ? "La orden no está pagada. Solo se pueden crear guías para órdenes pagadas."
            : data.code === "unauthorized"
              ? "No tienes permisos para realizar esta acción."
              : data.code === "order_not_found"
                ? "La orden no existe."
                : data.code === "unsupported_provider"
                  ? "El proveedor de envío no es compatible."
                  : data.code === "missing_shipping_rate"
                    ? "La orden no tiene un rate_id de Skydropx guardado."
                        : data.code === "missing_address_data"
                          ? "No se encontraron datos de dirección en la orden."
                      : data.code === "skydropx_error"
                        ? "Error al crear la guía en Skydropx. Revisa los logs."
                        : data.message || "Error desconocido al crear la guía.";

        setError(errorMessage);
            // Si falta dirección, sugerir editar override
            if (data.code === "missing_address_data" && typeof window !== "undefined") {
              // agregar un hash para ayudar a ubicar el editor
              window.location.hash = "#shipping-override";
            }
        return;
      }

      // Actualizar estado local
      setTrackingNumber(data.trackingNumber);
      setLabelUrl(data.labelUrl);

      // Llamar callback si existe
      if (onSuccess) {
        onSuccess({
          trackingNumber: data.trackingNumber,
          labelUrl: data.labelUrl,
        });
      }

      // Recargar la página para actualizar datos del servidor
      window.location.reload();
    } catch (err) {
      console.error("[CreateSkydropxLabelClient] Error:", err);
      setError("Error de red al crear la guía. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  // Si ya tiene tracking, mostrar información
  if (trackingNumber || hasLabelCreated) {
    const displayTracking = trackingNumber || currentTrackingNumber;
    const displayLabelUrl = labelUrl || currentLabelUrl;

    return (
      <div className="mt-4 space-y-3">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                {hasLabelCreated ? "Etiqueta creada" : "Guía creada"}
              </h4>
              {displayTracking && (
                <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                  Número de rastreo: <span className="font-mono font-medium">{displayTracking}</span>
                </p>
              )}
              {displayLabelUrl && (
                <div className="flex gap-2 mt-3">
                  <a
                    href={displayLabelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-md hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {hasLabelCreated ? "Reimprimir etiqueta" : "Abrir etiqueta"}
                  </a>
                  <a
                    href={displayLabelUrl}
                    download
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-md hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si no puede crear guía, mostrar mensaje o botón deshabilitado
  if (!canCreateLabel) {
    if (paymentStatus !== "paid") {
      return (
        <div className="mt-4">
          <button
            type="button"
            disabled
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed font-medium"
            title="Solo se pueden crear guías para órdenes pagadas"
          >
            Crear guía en Skydropx
          </button>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            La orden debe estar pagada para crear una guía de envío.
          </p>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={handleCreateLabel}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creando guía...
          </>
        ) : (
          <>
            <Package className="w-4 h-4" />
            Crear guía en Skydropx
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}

