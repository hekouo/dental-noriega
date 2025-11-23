"use client";

/**
 * Tipo para items de productos vistos recientemente
 * Alineado con CatalogItem pero simplificado para localStorage
 */
export type RecentlyViewedItem = {
  id: string;
  section: string;
  slug: string;
  title: string;
  priceCents?: number | null;
  image_url?: string | null;
  inStock?: boolean | null;
};

const STORAGE_KEY = "ddn_recent_products";
const MAX_ITEMS = 8;

/**
 * Verifica si localStorage está disponible (evita errores en SSR)
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const test = "__localStorage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtiene la lista de productos vistos recientemente desde localStorage
 * @returns Array de productos vistos, ordenados del más reciente al más antiguo
 */
export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Validar que cada item tenga los campos mínimos requeridos
    return parsed.filter(
      (item): item is RecentlyViewedItem =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.section === "string" &&
        typeof item.slug === "string" &&
        typeof item.title === "string",
    );
  } catch (error) {
    console.warn("[recentlyViewed] Error al leer localStorage:", error);
    return [];
  }
}

/**
 * Agrega un producto a la lista de vistos recientemente
 * - Si el producto ya existe, lo mueve al inicio
 * - Limita la lista a MAX_ITEMS
 * @param item Producto a agregar
 */
export function addRecentlyViewed(item: RecentlyViewedItem): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const current = getRecentlyViewed();

    // Remover cualquier entrada con el mismo id
    const filtered = current.filter((existing) => existing.id !== item.id);

    // Insertar el nuevo item al inicio
    const updated = [item, ...filtered].slice(0, MAX_ITEMS);

    // Guardar en localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn("[recentlyViewed] Error al guardar en localStorage:", error);
  }
}

/**
 * Limpia la lista de productos vistos recientemente
 */
export function clearRecentlyViewed(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[recentlyViewed] Error al limpiar localStorage:", error);
  }
}

