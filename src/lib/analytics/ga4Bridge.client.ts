"use client";

import { useEffect, useRef } from "react";
import type { AnalyticsEvent } from "./events";

/**
 * Tipos para window con ddnAnalyticsQueue y gtag
 * Compatible con las definiciones existentes en analytics.ts y utils/analytics.ts
 * Nota: dataLayer se declara en otros archivos, solo agregamos ddnAnalyticsQueue aquí
 */
declare global {
  interface Window {
    ddnAnalyticsQueue?: AnalyticsEvent[];
  }
}

/**
 * Marca interna para evitar re-envío de eventos
 */
interface MarkedEvent extends AnalyticsEvent {
  _sentToGa4?: boolean;
}

/**
 * Normaliza el payload para GA4
 */
function normalizePayload(
  eventName: string,
  payload?: Record<string, unknown>,
): Record<string, unknown> {
  if (!payload) return {};

  const normalized: Record<string, unknown> = {};

  // Mapeo específico para eventos conocidos
  if (eventName === "add_to_cart") {
    // GA4 espera item_id, item_name, value, currency, quantity
    if (payload.product_id) normalized.item_id = payload.product_id;
    if (payload.title) normalized.item_name = payload.title;
    if (payload.price_cents != null) {
      normalized.value = (payload.price_cents as number) / 100;
      normalized.currency = "MXN";
    }
    if (payload.quantity != null) normalized.quantity = payload.quantity;
    // Agregar campos adicionales
    if (payload.section) normalized.item_category = payload.section;
    if (payload.slug) normalized.item_variant = payload.slug;
    if (payload.source) normalized.source = payload.source;
  } else if (eventName === "begin_checkout") {
    // GA4 espera value, currency, items
    if (payload.subtotal_cents != null) {
      normalized.value = (payload.subtotal_cents as number) / 100;
      normalized.currency = "MXN";
    }
    if (payload.cart_items_count != null) {
      normalized.items_count = payload.cart_items_count;
    }
    if (payload.source) normalized.source = payload.source;
  } else if (eventName === "purchase") {
    // GA4 espera transaction_id, value, currency, items
    if (payload.order_id) normalized.transaction_id = payload.order_id;
    if (payload.total_cents != null) {
      normalized.value = (payload.total_cents as number) / 100;
      normalized.currency = "MXN";
    }
    if (payload.email) normalized.email = payload.email;
    if (payload.points_earned != null) {
      normalized.loyalty_points_earned = payload.points_earned;
    }
    if (payload.points_spent != null) {
      normalized.loyalty_points_spent = payload.points_spent;
    }
  } else if (eventName === "whatsapp_click") {
    // Mapear a select_content
    normalized.content_type = "whatsapp";
    if (payload.context) normalized.content_id = payload.context;
    if (payload.product_id) normalized.item_id = payload.product_id;
    if (payload.title) normalized.item_name = payload.title;
    if (payload.section) normalized.item_category = payload.section;
  }

  // Para eventos desconocidos, pasar el payload tal cual (filtrado)
  if (Object.keys(normalized).length === 0 && payload) {
    // Copiar payload pero excluir null/undefined
    Object.keys(payload).forEach((key) => {
      const value = payload[key];
      if (value !== null && value !== undefined) {
        normalized[key] = value;
      }
    });
  }

  return normalized;
}

/**
 * Envía un evento a GA4 usando gtag
 */
function sendToGa4(event: AnalyticsEvent, gtag: (...args: unknown[]) => void): void {
  const eventName = event.name;
  const normalizedPayload = normalizePayload(eventName, event.payload);

  // Mapeo de nombres de eventos
  let ga4EventName = eventName;

  if (eventName === "whatsapp_click") {
    ga4EventName = "select_content";
  }

  // Enviar a GA4
  gtag("event", ga4EventName, normalizedPayload);
}

/**
 * Componente bridge que conecta window.ddnAnalyticsQueue con GA4
 */
export function AnalyticsGa4Bridge(): null {
  const initializedRef = useRef(false);
  const processedEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Solo ejecutar en cliente
    if (typeof window === "undefined") return;

    const ga4Id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
    if (!ga4Id) {
      // No hay GA4 configurado, no hacer nada
      return;
    }

    // Evitar inicialización múltiple
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Asegurar que dataLayer existe (el script de gtag ya lo inicializa)
    const dataLayer = (window as { dataLayer?: Array<Record<string, unknown>> }).dataLayer;
    if (!dataLayer) {
      (window as { dataLayer: Array<Record<string, unknown>> }).dataLayer = [];
    }

    // Asegurar que gtag existe (el script de gtag ya lo define)
    // Si por alguna razón no existe, definirlo como fallback
    if (!window.gtag) {
      window.gtag = function gtag(...args: unknown[]) {
        const dl = (window as { dataLayer?: Array<Record<string, unknown>> }).dataLayer;
        if (dl) {
          // gtag puede recibir diferentes tipos de argumentos
          // Convertir args a un objeto si es necesario
          if (args.length > 0) {
            const firstArg = args[0];
            if (typeof firstArg === "string") {
              // Formato: gtag("event", "event_name", {...})
              const eventObj: Record<string, unknown> = {
                event: firstArg,
              };
              if (args.length > 1 && typeof args[1] === "object" && args[1] !== null) {
                Object.assign(eventObj, args[1]);
              }
              dl.push(eventObj);
            } else if (typeof firstArg === "object" && firstArg !== null) {
              dl.push(firstArg as Record<string, unknown>);
            }
          }
        }
      };
    }

    // Asegurar que ddnAnalyticsQueue existe
    if (!window.ddnAnalyticsQueue) {
      window.ddnAnalyticsQueue = [];
    }

    // Función para procesar un evento
    const processEvent = (event: MarkedEvent): void => {
      // Evitar re-procesamiento
      if (event._sentToGa4) return;

      // Crear una clave única para el evento (timestamp + name)
      const eventKey = `${event.timestamp}-${event.name}`;
      if (processedEventsRef.current.has(eventKey)) return;

      // Marcar como procesado
      event._sentToGa4 = true;
      processedEventsRef.current.add(eventKey);

      // Enviar a GA4
      if (window.gtag) {
        try {
          sendToGa4(event, window.gtag);
        } catch (error) {
          // Silenciar errores de GA4 en producción
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.warn("[GA4 Bridge] Error sending event:", error);
          }
        }
      }
    };

    // Procesar eventos ya presentes en la cola
    const existingQueue = window.ddnAnalyticsQueue;
    if (Array.isArray(existingQueue)) {
      existingQueue.forEach((event) => {
        if (event && typeof event === "object" && "name" in event) {
          processEvent(event as MarkedEvent);
        }
      });
    }

    // Monkey patch del push para capturar futuros eventos
    const originalPush = Array.prototype.push;
    const queueArray = window.ddnAnalyticsQueue;

    if (queueArray && Array.isArray(queueArray)) {
      // Reemplazar push con nuestra versión que también envía a GA4
      Object.defineProperty(queueArray, "push", {
        value: function push(...items: AnalyticsEvent[]) {
          const result = originalPush.apply(this, items);
          // Procesar cada nuevo evento
          items.forEach((item) => {
            if (item && typeof item === "object" && "name" in item) {
              processEvent(item as MarkedEvent);
            }
          });
          return result;
        },
        writable: true,
        configurable: true,
      });
    }
  }, []);

  // Este componente no renderiza nada
  return null;
}

