"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Package, Truck, CheckCircle, Clock, XCircle, MapPin, ExternalLink } from "lucide-react";
import { getShippingStatusLabel } from "@/lib/orders/shippingStatus";

type ShippingEvent = {
  id: string;
  provider: string;
  raw_status: string | null;
  mapped_status: string | null;
  tracking_number: string | null;
  label_url: string | null;
  occurred_at: string | null;
  created_at: string;
};

type Props = {
  orderId: string;
  shippingStatus: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  paymentStatus: string | null;
};

/**
 * Componente de tracking visual tipo "Amazon-lite" para mostrar timeline de envío
 */
export default function ShippingTrackingTimeline({
  orderId,
  shippingStatus,
  trackingNumber,
  labelUrl,
  paymentStatus,
}: Props) {
  const [events, setEvents] = useState<ShippingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, [orderId]);

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setError("No se pudo conectar a la base de datos");
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("shipping_events")
        .select("*")
        .eq("order_id", orderId)
        .order("occurred_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(20); // Últimos 20 eventos

      if (fetchError) {
        if (process.env.NODE_ENV === "development") {
          console.error("[ShippingTrackingTimeline] Error al cargar eventos:", fetchError);
        }
        setError("No se pudieron cargar los eventos de envío");
        return;
      }

      setEvents(data || []);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[ShippingTrackingTimeline] Error inesperado:", err);
      }
      setError("Error al cargar la información de envío");
    } finally {
      setIsLoading(false);
    }
  };

  // Determinar estados de la barra de progreso
  const getStepStatus = (step: string): "completed" | "current" | "pending" => {
    const normalizedShipping = shippingStatus?.toLowerCase() || "";
    const isPaid = paymentStatus === "paid";

    switch (step) {
      case "recibido":
        return "completed"; // Orden creada
      case "pagado":
        return isPaid ? "completed" : "pending";
      case "guia":
        // Guía creada si hay label_created, in_transit, delivered, ready_for_pickup
        if (
          normalizedShipping === "label_created" ||
          normalizedShipping === "in_transit" ||
          normalizedShipping === "delivered" ||
          normalizedShipping === "ready_for_pickup"
        ) {
          return "completed";
        }
        // En proceso si está pagado pero aún no hay guía
        if (normalizedShipping === "pending_shipment" && isPaid) {
          return "current";
        }
        return "pending";
      case "transito":
        if (normalizedShipping === "in_transit") {
          return "current";
        }
        if (normalizedShipping === "delivered" || normalizedShipping === "ready_for_pickup") {
          return "completed";
        }
        return "pending";
      case "entregado":
        return normalizedShipping === "delivered" || normalizedShipping === "ready_for_pickup" ? "completed" : "pending";
      default:
        return "pending";
    }
  };

  const formatEventDate = (dateString: string | null) => {
    if (!dateString) return "Fecha no disponible";
    try {
      return format(new Date(dateString), "PPP 'a las' HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  const getStatusIcon = (status: string | null) => {
    const normalized = status?.toLowerCase() || "";
    if (normalized.includes("delivered") || normalized === "ready_for_pickup") {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (normalized.includes("in_transit") || normalized.includes("transit")) {
      return <Truck className="w-5 h-5 text-blue-600" />;
    }
    if (normalized.includes("label") || normalized.includes("created")) {
      return <Package className="w-5 h-5 text-orange-600" />;
    }
    if (normalized.includes("cancel") || normalized.includes("exception")) {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  // Si está cancelado, no mostrar timeline (pero mostrar mensaje si hay tracking previo)
  if (shippingStatus === "cancelled") {
    return null;
  }

  // Solo mostrar si hay evidencia de envío o está pendiente de envío
  const hasShippingEvidence = trackingNumber || events.length > 0 || shippingStatus === "pending_shipment" || shippingStatus === "label_created" || shippingStatus === "in_transit" || shippingStatus === "delivered" || shippingStatus === "ready_for_pickup";
  
  if (!hasShippingEvidence) {
    return null;
  }

  return (
    <div className="mt-6 pt-4 border-t border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Estado de envío</h3>

      {/* Barra de pasos tipo Amazon */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {["recibido", "pagado", "guia", "transito", "entregado"].map((step, index) => {
            const status = getStepStatus(step);
            const isLast = index === 4;
            const stepLabels: Record<string, string> = {
              recibido: "Recibido",
              pagado: "Pagado",
              guia: "Guía",
              transito: "En tránsito",
              entregado: "Entregado",
            };

            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors ${
                      status === "completed"
                        ? "bg-green-600 text-white"
                        : status === "current"
                          ? "bg-blue-600 text-white ring-4 ring-blue-100"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {status === "completed" ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium text-center ${
                      status === "completed" || status === "current" ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {stepLabels[step]}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={`h-1 flex-1 mx-2 -mt-6 ${
                      status === "completed" ? "bg-green-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tracking number y botón rastrear */}
      {trackingNumber && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Número de guía</p>
              <p className="font-mono text-sm text-blue-700 dark:text-blue-300 mt-1">{trackingNumber}</p>
            </div>
            {labelUrl && (
              <a
                href={labelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ver etiqueta
              </a>
            )}
          </div>
          <div className="mt-3">
            <a
              href={`https://skydropx.com/tracking/${trackingNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Rastrear en Skydropx
            </a>
          </div>
        </div>
      )}

      {/* Timeline de eventos */}
      {events.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Historial de eventos</h4>
          <div className="space-y-4">
            {events.map((event, index) => {
              const isFirst = index === 0;
              const statusLabel = event.mapped_status ? getShippingStatusLabel(event.mapped_status) : event.raw_status || "Evento";
              const eventDate = event.occurred_at || event.created_at;

              return (
                <div key={event.id} className="flex gap-4">
                  {/* Línea vertical */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isFirst ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      {getStatusIcon(event.mapped_status || event.raw_status)}
                    </div>
                    {index < events.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2" />
                    )}
                  </div>

                  {/* Contenido del evento */}
                  <div className="flex-1 pb-4">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{statusLabel}</p>
                    {event.raw_status && event.raw_status !== event.mapped_status && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Estado original: {event.raw_status}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {formatEventDate(eventDate)}
                    </p>
                    {event.tracking_number && event.tracking_number !== trackingNumber && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
                        Tracking: {event.tracking_number}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Cargando eventos de envío...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">{error}</p>
        </div>
      )}
    </div>
  );
}
