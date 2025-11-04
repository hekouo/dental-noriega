// src/lib/utils/persist.ts
/**
 * Utilidades de persistencia local con TTL
 */

export const TTL_48H = 1000 * 60 * 60 * 48;

type PersistedValue<T> = {
  exp: number;
  v: T;
};

/**
 * Parsea un string de forma segura a tipo T
 */
export function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Obtiene un valor del localStorage con TTL
 * Retorna null si expiró o no existe
 */
export function getWithTTL<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = safeParse<PersistedValue<T>>(raw);
    if (!parsed) return null;

    // Verificar expiración
    if (Date.now() > parsed.exp) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.v;
  } catch {
    return null;
  }
}

/**
 * Guarda un valor en localStorage con TTL
 */
export function setWithTTL<T>(
  key: string,
  value: T,
  ttlMs: number = TTL_48H,
): void {
  if (typeof window === "undefined") return;

  try {
    const exp = Date.now() + ttlMs;
    const persisted: PersistedValue<T> = { exp, v: value };
    localStorage.setItem(key, JSON.stringify(persisted));
  } catch {
    // noop - puede fallar si localStorage está lleno o deshabilitado
  }
}

/**
 * Remueve una clave del localStorage
 */
export function removeWithTTL(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
}

// Claves constantes
export const KEYS = {
  CART: "DDN_CART_V1",
  CHECKOUT: "DDN_CHECKOUT_V1",
  LAST_ORDER: "DDN_LAST_ORDER_V1",
} as const;
