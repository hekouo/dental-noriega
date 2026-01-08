"use client";

import { useState } from "react";
import { formatMXNFromCents } from "@/lib/utils/currency";

type RequoteSkydropxRatesClientProps = {
  orderId: string;
  currentRatePriceCents: number | null;
  quotedAt: string | null; // ISO string
};

type Rate = {
  external_id: string;
  provider: string;
  service: string;
  option_code?: string;
  eta_min_days: number | null;
  eta_max_days: number | null;
  price_cents: number;
};

/**
 * Componente para recotizar envíos de Skydropx en Admin
 */
export default function RequoteSkydropxRatesClient({
  orderId,
  currentRatePriceCents,
  quotedAt,
}: RequoteSkydropxRatesClientProps) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [rates, setRates] = useState<Rate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Verificar si la tarifa está expirada o próxima a expirar
  const isExpiredOrExpiring = (): boolean => {
    if (!quotedAt) return true; // Si no hay quoted_at, considerar expirada

    const quotedDate = new Date(quotedAt);
    const now = new Date();
    const hoursSinceQuote = (now.getTime() - quotedDate.getTime()) / (1000 * 60 * 60);

    return hoursSinceQuote >= 24; // Expira a las 24 horas
  };

  const isExpiringSoon = (): boolean => {
    if (!quotedAt) return false;

    const quotedDate = new Date(quotedAt);
    const now = new Date();
    const hoursSinceQuote = (now.getTime() - quotedDate.getTime()) / (1000 * 60 * 60);

    return hoursSinceQuote >= 20 && hoursSinceQuote < 24; // Próxima a expirar entre 20-24h
  };

  const handleRequote = async () => {
    setLoading(true);
    setError(null);
    setRates(null);

    try {
      const res = await fetch("/api/admin/shipping/skydropx/requote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();

      if (!data.ok) {
        const errorMessage =
          data.code === "unauthorized"
            ? "No tienes permisos para realizar esta acción."
            : data.code === "order_not_found"
              ? "La orden no existe."
              : data.code === "unsupported_provider"
                ? "Esta orden no usa Skydropx como proveedor de envío."
                : data.code === "pickup_not_quotable"
                  ? "No se pueden recotizar envíos de recogida en tienda."
                  : data.code === "missing_address_data"
                    ? "No se encontraron datos de dirección en la orden."
                    : data.message || "Error al recotizar el envío.";

        setError(errorMessage);
        return;
      }

      setRates(data.rates || []);
      
      // Mostrar warning si viene del backend
      if (data.warning) {
        setError(data.warning);
      }
    } catch (err) {
      console.error("[RequoteSkydropxRatesClient] Error:", err);
      setError("Error de red al recotizar el envío.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRate = async (rate: Rate) => {
    setApplying(rate.external_id);
    setError(null);

    try {
      const res = await fetch("/api/admin/shipping/skydropx/apply-rate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          rateExternalId: rate.external_id,
          service: rate.service,
          provider: rate.provider,
          priceCents: rate.price_cents,
          etaMin: rate.eta_min_days,
          etaMax: rate.eta_max_days,
          optionCode: rate.option_code,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        const errorMessage =
          data.code === "unauthorized"
            ? "No tienes permisos para realizar esta acción."
            : data.code === "order_not_found"
              ? "La orden no existe."
              : data.code === "label_already_created"
                ? "No se puede cambiar la tarifa porque ya se creó la guía. Primero cancela la guía existente."
                : data.message || "Error al aplicar la tarifa.";

        setError(errorMessage);
        setApplying(null);
        return;
      }

      // Refrescar página para mostrar cambios
      window.location.reload();
    } catch (err) {
      console.error("[RequoteSkydropxRatesClient] Error:", err);
      setError("Error de red al aplicar la tarifa.");
      setApplying(null);
    }
  };

  const getPriceDifference = (newPriceCents: number): number => {
    if (!currentRatePriceCents) return newPriceCents;
    return newPriceCents - currentRatePriceCents;
  };

  const formatETA = (min: number | null, max: number | null): string => {
    if (min === null && max === null) return "No disponible";
    if (min === null) return `${max} días`;
    if (max === null) return `${min} días`;
    if (min === max) return `${min} días`;
    return `${min}-${max} días`;
  };

  return (
    <div className="space-y-4">
      {/* Warning si está expirada o próxima a expirar */}
      {(isExpiredOrExpiring() || isExpiringSoon()) && (
        <div
          className={`rounded-lg border p-4 ${
            isExpiredOrExpiring()
              ? "bg-yellow-50 border-yellow-200"
              : "bg-orange-50 border-orange-200"
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3
                className={`text-sm font-medium ${
                  isExpiredOrExpiring() ? "text-yellow-800" : "text-orange-800"
                }`}
              >
                {isExpiredOrExpiring()
                  ? "Tarifa expirada"
                  : "Tarifa próxima a expirar"}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  isExpiredOrExpiring() ? "text-yellow-700" : "text-orange-700"
                }`}
              >
                {isExpiredOrExpiring()
                  ? "Esta tarifa tiene más de 24 horas desde su cotización y puede estar expirada. Recotiza para obtener tarifas actualizadas."
                  : "Esta tarifa está próxima a expirar (20-24 horas). Recotiza si necesitas actualizar el precio."}
                {quotedAt && (
                  <span className="block mt-1 text-xs opacity-75">
                    Cotizada: {new Date(quotedAt).toLocaleString("es-MX")}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botón Recotizar */}
      <div>
        <button
          onClick={handleRequote}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loading ? "Recotizando..." : "Recotizar envío (Skydropx)"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Lista de rates */}
      {rates && rates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">Tarifas disponibles:</h4>
          {rates.map((rate) => {
            const priceDiff = getPriceDifference(rate.price_cents);
            return (
              <div
                key={rate.external_id}
                className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {rate.provider} - {rate.service}
                      </span>
                      {priceDiff > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          +{formatMXNFromCents(priceDiff)}
                        </span>
                      )}
                      {priceDiff < 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {formatMXNFromCents(priceDiff)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">
                        {formatMXNFromCents(rate.price_cents)}
                      </span>
                      {" • "}
                      <span>ETA: {formatETA(rate.eta_min_days, rate.eta_max_days)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleApplyRate(rate)}
                  disabled={applying === rate.external_id}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {applying === rate.external_id ? "Aplicando..." : "Aplicar esta tarifa"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {rates && rates.length === 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            No se encontraron tarifas disponibles para esta dirección.
          </p>
        </div>
      )}
    </div>
  );
}
