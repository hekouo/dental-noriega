// src/lib/utils/persist.ts
/**
 * Utilidades de persistencia con TTL (Time To Live)
 */

export const TTL_48H = 1000 * 60 * 60 * 48;

type StoredValue<T> = {
  exp: number;
  v: T;
};

/**
 * Obtiene un valor del localStorage con TTL
 */
export function getWithTTL<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = safeParse<StoredValue<T>>(raw);
    if (!parsed) return null;

    if (parsed.exp < Date.now()) {
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
    const stored: StoredValue<T> = {
      exp: Date.now() + ttlMs,
      v: value,
    };
    localStorage.setItem(key, JSON.stringify(stored));
  } catch {
    // noop - localStorage puede estar lleno o deshabilitado
  }
}

/**
 * Parsea JSON de forma segura
 */
export function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Claves de persistencia
export const LS_KEYS = {
  CART: "DDN_CART_V1",
  CHECKOUT: "DDN_CHECKOUT_V1",
  LAST_ORDER: "DDN_LAST_ORDER_V1",
} as const;

