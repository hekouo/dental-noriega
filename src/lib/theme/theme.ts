/**
 * Theme engine - client-only utilities
 * Maneja persistencia y aplicación de tema (light/dark/system)
 */

export type Theme = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme-preference";

/**
 * Obtiene el tema guardado en localStorage
 */
export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Guarda el tema en localStorage
 */
export function setStoredTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Silenciar errores de localStorage (puede estar deshabilitado)
  }
}

/**
 * Obtiene el tema del sistema (prefers-color-scheme)
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

/**
 * Resuelve un tema a "light" o "dark"
 * Si es "system", consulta prefers-color-scheme
 */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

/**
 * Aplica el tema al documento agregando/removiendo la clase "dark"
 */
export function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/**
 * Obtiene el tema inicial a usar
 * Prioridad: localStorage > system
 */
export function getInitialTheme(): Theme {
  const stored = getStoredTheme();
  return stored ?? "system";
}
