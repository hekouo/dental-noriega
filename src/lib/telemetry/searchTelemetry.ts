"use client";

type SearchEventType =
  | "search_submit"
  | "search_suggestion_click"
  | "search_no_results";

type SearchEventPayload = {
  query: string;
  productId?: string;
  slug?: string;
  timestamp?: number;
};

type SearchEvent = {
  type: SearchEventType;
  payload: SearchEventPayload;
  timestamp: number;
};

const STORAGE_KEY = "ddn_search_telemetry_v1";
const MAX_EVENTS = 30;
const isDev = process.env.NODE_ENV === "development";

/**
 * Guarda un evento de búsqueda en localStorage
 */
function saveEvent(event: SearchEvent): void {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const events: SearchEvent[] = raw ? JSON.parse(raw) : [];
    events.push(event);
    // Mantener solo los últimos N eventos
    const trimmed = events.slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    // Silenciar errores de localStorage (puede estar lleno o deshabilitado)
    if (isDev) {
      console.warn("[searchTelemetry] Failed to save event:", error);
    }
  }
}

/**
 * Trackea un evento de búsqueda
 */
export function trackSearchEvent(
  type: SearchEventType,
  payload: SearchEventPayload,
): void {
  const event: SearchEvent = {
    type,
    payload: {
      ...payload,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  };

  // En dev: loggear
  if (isDev) {
    console.debug("[searchTelemetry]", type, payload);
  }

  // Guardar en localStorage
  saveEvent(event);
}

/**
 * Obtiene los últimos eventos de búsqueda (útil para debugging)
 */
export function getSearchEvents(): SearchEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Limpia todos los eventos guardados
 */
export function clearSearchEvents(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

