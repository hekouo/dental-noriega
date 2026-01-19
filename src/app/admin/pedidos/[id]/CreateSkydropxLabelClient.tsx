"use client";

import { useState } from "react";
import { Loader2, Package, Download, RefreshCw } from "lucide-react";

type Props = {
  orderId: string;
  paymentStatus: string | null;
  shippingProvider: string | null;
  shippingStatus: string | null;
  currentTrackingNumber: string | null;
  currentLabelUrl: string | null;
  hasShipmentId: boolean;
  onSuccess?: (data: { trackingNumber: string; labelUrl: string | null }) => void;
};

export default function CreateSkydropxLabelClient({
  orderId,
  paymentStatus,
  shippingProvider,
  shippingStatus,
  currentTrackingNumber,
  currentLabelUrl,
  hasShipmentId,
  onSuccess,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(currentTrackingNumber);
  const [labelUrl, setLabelUrl] = useState<string | null>(currentLabelUrl);
  
  // trackingPending solo debe ser true si REALMENTE hay evidencia de que se creó una guía:
  // - shippingStatus === "label_pending_tracking" (explícitamente marcado como pendiente)
  // - O hay shipment_id pero no hay tracking/label (guía creada pero tracking pendiente)
  const [trackingPending, setTrackingPending] = useState(
    shippingStatus === "label_pending_tracking" || (hasShipmentId && !currentTrackingNumber && !currentLabelUrl),
  );

  // Verificar si ya tiene label creada (requiere evidencia real: tracking O label_url O shipment_id)
  const hasLabelCreated =
    (shippingStatus === "label_created" && currentLabelUrl) ||
    (currentTrackingNumber && currentLabelUrl) ||
    (hasShipmentId && (currentTrackingNumber || currentLabelUrl));

  // Verificar si realmente hay una guía creada (evidencia: shipment_id O tracking O label)
  const hasLabelEvidence = hasShipmentId || currentTrackingNumber || currentLabelUrl;

  // Verificar si se puede crear guía (solo si NO hay evidencia de guía creada)
  const canCreateLabel =
    !hasLabelEvidence &&
    paymentStatus === "paid" &&
    (shippingProvider === "skydropx" || shippingProvider === "Skydropx");

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
        // Manejar tracking_pending como caso especial (no es un error real)
        if (data.code === "tracking_pending") {
          setTrackingPending(true);
          setError(null);
          // No recargar página, mostrar mensaje y botón de sincronización
          return;
        }

        let errorMessage =
          data.code === "payment_not_paid"
            ? "La orden no está pagada. Solo se pueden crear guías para órdenes pagadas."
            : data.code === "unauthorized"
              ? "No tienes permisos para realizar esta acción."
              : data.code === "order_not_found"
                ? "La orden no existe."
                : data.code === "unsupported_provider"
                  ? "El proveedor de envío no es compatible."
                  : data.code === "missing_shipping_rate"
                    ? "No hay tarifa guardada. Intenta crear la guía de nuevo."
                  : data.code === "missing_address_data" ||
                      data.code === "missing_shipping_address"
                    ? "Falta dirección en la orden."
            : data.code === "label_creation_in_progress"
              ? "La creación de la guía está en progreso. Intenta de nuevo en unos momentos."
                    : data.code === "missing_final_package"
                      ? "Captura peso y medidas reales de la caja antes de crear guía. Ve a la sección 'Paquete real para guía'."
                    : data.code === "skydropx_no_rates" || data.statusCode === 502
                      ? "Skydropx todavía no devolvió tarifas. Intenta Recotizar y vuelve a Crear guía."
                      : data.code === "invalid_shipping_payload"
                        ? (() => {
                            const missing = Array.isArray(data.details?.missingFields) ? data.details.missingFields as string[] : [];
                            const hasConsignmentNote = missing.some((f) => f.includes("consignment_note"));
                            const hasPackageType = missing.some((f) => f.includes("package_type"));
                            if (hasConsignmentNote || hasPackageType) {
                              return "Faltan códigos Carta Porte: consignment_note y package_type. Configura env vars (SKYDROPX_DEFAULT_CONSIGNMENT_NOTE, SKYDROPX_DEFAULT_PACKAGE_TYPE) o guarda en metadata.shipping.";
                            }
                            return `Faltan campos requeridos: ${missing.join(", ")}`;
                          })()
                        : data.code === "skydropx_bad_request"
                          ? "Skydropx rechazó el payload. Revisa ORIGIN_* env vars y campos requeridos. Ver detalles abajo."
                          : data.code === "skydropx_unprocessable_entity"
                            ? (() => {
                                const upstream = data.details?.upstream as Record<string, unknown> | undefined;
                                const errors = upstream?.errors as Array<{ field?: string | null; message?: string }> | undefined;
                                const hasConsignmentNote = errors?.some((e) => e.field?.includes("consignment_note") || e.message?.includes("consignment_note"));
                                const hasPackageType = errors?.some((e) => e.field?.includes("package_type") || e.message?.includes("package_type"));
                                if (hasConsignmentNote || hasPackageType) {
                                  return "Faltan códigos Carta Porte: consignment_note y package_type. Configura env vars (SKYDROPX_DEFAULT_CONSIGNMENT_NOTE, SKYDROPX_DEFAULT_PACKAGE_TYPE) o guarda en metadata.shipping.";
                                }
                                return "Skydropx rechazó el envío por errores de validación. Ver lista de errores abajo.";
                              })()
                            : data.code === "skydropx_error"
                              ? "Error al crear la guía en Skydropx. Revisa los logs."
                              : data.message || "Error desconocido al crear la guía.";

        // Si hay errores de Skydropx (422/400), mostrar lista
        if ((data.code === "skydropx_unprocessable_entity" || data.code === "skydropx_bad_request") && data.details?.upstream?.errors) {
          const errors = data.details.upstream.errors as Array<{ field?: string | null; message?: string }>;
          if (Array.isArray(errors) && errors.length > 0) {
            errorMessage += "\n\nErrores de validación:\n";
            errors.forEach((err, idx) => {
              const field = err.field ? `[${err.field}]` : "";
              const msg = err.message || "Error desconocido";
              errorMessage += `${idx + 1}. ${field} ${msg}\n`;
            });
          }
        } else if (data.code === "skydropx_unprocessable_entity" || data.code === "skydropx_bad_request") {
          // Si no hay errors pero sí keys, avisar que no se pudo parsear
          const upstream = data.details?.upstream as Record<string, unknown> | undefined;
          if (upstream?.keys && Array.isArray(upstream.keys) && upstream.keys.includes("errors")) {
            errorMessage += "\n\nNota: Skydropx devolvió errores, pero no se pudo parsear el formato. Ver logs para detalles.";
          }
        }

        // Si hay payloadHealth (400), agregarlo al mensaje
        if (data.code === "skydropx_bad_request" && data.details?.payloadHealth) {
          const ph = data.details.payloadHealth as Record<string, boolean | number>;
          const missing = Object.entries(ph)
            .filter(([k, v]) => k.startsWith("has") && v === false)
            .map(([k]) => k.replace("has", "").replace(/([A-Z])/g, " $1").trim());
          if (missing.length > 0) {
            errorMessage += `\n\nCampos faltantes detectados: ${missing.join(", ")}`;
          }
        }

        setError(errorMessage);
        // Si falta dirección, sugerir editar override
        if (
          (data.code === "missing_address_data" || data.code === "missing_shipping_address") &&
          typeof window !== "undefined"
        ) {
          // agregar un hash para ayudar a ubicar el editor
          window.location.hash = "#shipping-override";
        }
        return;
      }

      // Actualizar estado local
      setTrackingNumber(data.trackingNumber);
      setLabelUrl(data.labelUrl);
      setTrackingPending(data.trackingPending || false);

      // Si tracking está pendiente, no recargar página (mostrar mensaje)
      if (data.trackingPending) {
        setError(null);
        return;
      }

      // Llamar callback si existe
      if (onSuccess) {
        onSuccess({
          trackingNumber: data.trackingNumber || "",
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

  const handleSyncTracking = async () => {
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
        const errorMessage =
          data.code === "missing_shipment_id"
            ? "La orden no tiene shipment_id guardado. Crea la guía primero."
            : data.code === "skydropx_not_found"
              ? "No se encontró el envío en Skydropx."
              : data.code === "skydropx_unauthorized"
                ? "Error de autenticación con Skydropx."
                : data.message || "Error desconocido al sincronizar tracking.";

        setError(errorMessage);
        return;
      }

      // Actualizar estado local
      if (data.trackingNumber) {
        setTrackingNumber(data.trackingNumber);
      }
      if (data.labelUrl) {
        setLabelUrl(data.labelUrl);
      }

      // Si ahora tenemos tracking y label completos, dejar de mostrar como pendiente
      if (data.trackingNumber && data.labelUrl) {
        setTrackingPending(false);
      }

      // Si se actualizó, recargar página
      if (data.updated) {
        window.location.reload();
      } else {
        // Si no se actualizó, puede ser que aún esté pendiente
        setError("El tracking/label aún no está disponible en Skydropx. Reintenta en unos momentos.");
      }
    } catch (err) {
      console.error("[CreateSkydropxLabelClient] Error al sincronizar:", err);
      setError("Error de red al sincronizar tracking. Intenta de nuevo.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Si tracking está pendiente Y hay evidencia de guía creada (shipment_id), mostrar mensaje y botón de sincronización
  // IMPORTANTE: Solo mostrar si REALMENTE hay shipment_id (evidencia de que se creó la guía)
  if (trackingPending && hasShipmentId && !trackingNumber && !labelUrl) {
    return (
      <div className="mt-4 space-y-3">
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
                Guía creada en Skydropx
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                El tracking/label aún no está disponible. Skydropx está procesando el envío. Reintenta en unos momentos.
              </p>
              <button
                type="button"
                onClick={handleSyncTracking}
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
                    <RefreshCw className="w-4 h-4" />
                    Actualizar tracking
                  </>
                )}
              </button>
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

  // Si ya tiene tracking O label O shipment_id (evidencia de guía creada), mostrar información
  if (trackingNumber || labelUrl || hasLabelCreated || hasShipmentId) {
    const displayTracking = trackingNumber || currentTrackingNumber;
    const displayLabelUrl = labelUrl || currentLabelUrl;
    const needsSync = hasShipmentId && !displayTracking && !displayLabelUrl;

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
              {displayLabelUrl ? (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <a
                    href={displayLabelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                  >
                    <Download className="w-4 h-4" />
                    Reimprimir etiqueta
                  </a>
                  {needsSync && (
                    <button
                      type="button"
                      onClick={handleSyncTracking}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Sincronizar
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : needsSync ? (
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleSyncTracking}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Sincronizar
                      </>
                    )}
                  </button>
                </div>
              ) : null}
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

  // Si no puede crear guía, mostrar mensaje o botón deshabilitado
  if (!canCreateLabel) {
    if (paymentStatus !== "paid") {
      return (
        <div className="mt-4 space-y-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  No se puede crear guía
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  No se puede crear guía hasta que el pedido esté marcado como pagado.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed font-medium"
            title="Solo se pueden crear guías para órdenes pagadas"
          >
            Crear guía en Skydropx
          </button>
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

