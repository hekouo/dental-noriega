"use client";

import { getShippingStatusLabel } from "@/lib/orders/shippingStatus";

type Props = {
  shippingProvider: string | null;
  shippingServiceName: string | null;
  shippingStatus: string | null;
  shippingTrackingNumber: string | null;
};

export default function ShippingSummaryClient({
  shippingProvider,
  shippingServiceName,
  shippingStatus,
  shippingTrackingNumber,
}: Props) {
  const handleCopyTracking = async () => {
    if (!shippingTrackingNumber) return;
    try {
      await navigator.clipboard.writeText(shippingTrackingNumber);
    } catch (err) {
      // Fallback si clipboard no está disponible
      console.warn("No se pudo copiar al portapapeles", err);
    }
  };

  const shippingStatusLabel = shippingStatus
    ? getShippingStatusLabel(shippingStatus)
    : "No enviado";

  const getProviderLabel = (): string => {
    if (!shippingProvider) {
      return "No enviado";
    }
    if (shippingProvider === "pickup") {
      return "Recoger en tienda";
    }
    if (shippingProvider === "skydropx") {
      return "Skydropx";
    }
    return shippingProvider;
  };
  const providerLabel = getProviderLabel();

  const serviceLabel = shippingServiceName || "—";

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-sm text-gray-700">
        <span className="font-medium">Envío:</span> {shippingStatusLabel}
        {" · "}
        <span className="font-medium">Proveedor:</span> {providerLabel}
        {" · "}
        <span className="font-medium">Servicio:</span> {serviceLabel}
      </p>
      {shippingTrackingNumber && (
        <div className="mt-2 flex items-center gap-2">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Número de guía:</span>{" "}
            <span className="font-mono">{shippingTrackingNumber}</span>
          </p>
          <button
            type="button"
            onClick={handleCopyTracking}
            className="text-xs text-primary-600 hover:text-primary-700 underline"
          >
            Copiar
          </button>
        </div>
      )}
    </div>
  );
}

