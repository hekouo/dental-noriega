"use client";

import { Package, ExternalLink, Download, AlertCircle, Copy } from "lucide-react";
import { useState } from "react";

type Props = {
  trackingNumber: string | null;
  labelUrl: string | null;
  shippingStatus: string | null;
  provider?: string | null;
  service?: string | null;
  etaMinDays?: number | null;
  etaMaxDays?: number | null;
};

/**
 * Componente para mostrar información de tracking automático cuando hay evidencia de guía creada
 */
export default function ShippingTrackingDisplay({
  trackingNumber,
  labelUrl,
  shippingStatus,
  provider,
  service,
  etaMinDays,
  etaMaxDays,
}: Props) {
  const normalizedStatus = shippingStatus?.toLowerCase() || "";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!trackingNumber) return;
    try {
      await navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[ShippingTrackingDisplay] No se pudo copiar tracking", err);
    }
  };

  const getEtaLabel = (): string | null => {
    if (typeof etaMinDays === "number" && typeof etaMaxDays === "number") {
      return `${etaMinDays}-${etaMaxDays} días`;
    }
    if (typeof etaMinDays === "number") {
      return `${etaMinDays}+ días`;
    }
    return null;
  };
  const etaLabel = getEtaLabel();

  return (
    <div className="space-y-3">
      {/* Tracking number */}
      {trackingNumber && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Número de guía
              </p>
              <p className="font-mono text-sm text-blue-700 dark:text-blue-300 mt-1">
                {trackingNumber}
              </p>
              <p className="text-xs text-blue-700/80 dark:text-blue-300/80 mt-1">
                {(() => {
                  const getProviderServiceText = (): string | null => {
                    if (!provider && !service) return null;
                    const providerPart = provider ?? "";
                    const separator = provider && service ? " • " : "";
                    const servicePart = service ?? "";
                    return `${providerPart}${separator}${servicePart}`;
                  };
                  const providerServiceText = getProviderServiceText();
                  const etaText = etaLabel ? ` • ETA ${etaLabel}` : null;
                  if (!providerServiceText && !etaText) return null;
                  return `${providerServiceText ?? ""}${etaText ?? ""}`;
                })()}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <a
                href={`https://skydropx.com/tracking/${trackingNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Rastrear
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Copiado" : "Copiar tracking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Label URL */}
      {labelUrl ? (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-900 dark:text-green-100 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Etiqueta disponible
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                La etiqueta PDF está lista para descargar
              </p>
            </div>
            <a
              href={labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Abrir etiqueta (PDF)
            </a>
          </div>
        </div>
      ) : trackingNumber && normalizedStatus !== "cancelled" ? (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Etiqueta pendiente
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                El tracking está disponible pero la etiqueta aún no está lista. Se actualizará automáticamente cuando Skydropx la genere.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
