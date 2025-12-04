/**
 * Estados canónicos de envío para órdenes
 */

export type ShippingStatus =
  | "pending"
  | "created"
  | "in_transit"
  | "ready_for_pickup"
  | "delivered"
  | "canceled";

/**
 * Etiquetas en español para cada estado de envío
 */
export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  pending: "Pendiente de envío",
  created: "Guía generada",
  in_transit: "En tránsito",
  ready_for_pickup: "Listo para recoger en tienda",
  delivered: "Entregado",
  canceled: "Envío cancelado",
};

/**
 * Variantes de color para badges según el estado
 */
export type ShippingStatusVariant = "info" | "warning" | "success" | "destructive" | "default";

export const SHIPPING_STATUS_VARIANTS: Record<ShippingStatus, ShippingStatusVariant> = {
  pending: "warning",
  created: "info",
  in_transit: "info",
  ready_for_pickup: "success",
  delivered: "success",
  canceled: "destructive",
};

/**
 * Obtiene el label de un estado de envío
 * @param status - Estado de envío (puede ser null o string no válido)
 * @returns Label en español o "Pendiente de envío" como fallback
 */
export function getShippingStatusLabel(
  status: string | null | undefined,
): string {
  if (!status || !isValidShippingStatus(status)) {
    return SHIPPING_STATUS_LABELS.pending;
  }
  return SHIPPING_STATUS_LABELS[status];
}

/**
 * Obtiene la variante de color para un estado de envío
 * @param status - Estado de envío (puede ser null o string no válido)
 * @returns Variante de color o "default" como fallback
 */
export function getShippingStatusVariant(
  status: string | null | undefined,
): ShippingStatusVariant {
  if (!status || !isValidShippingStatus(status)) {
    return "default";
  }
  return SHIPPING_STATUS_VARIANTS[status];
}

/**
 * Valida si un string es un estado de envío válido
 * @param status - String a validar
 * @returns true si es un estado válido
 */
export function isValidShippingStatus(status: string): status is ShippingStatus {
  return status in SHIPPING_STATUS_LABELS;
}

/**
 * Estado por defecto para nuevas órdenes
 */
export const DEFAULT_SHIPPING_STATUS: ShippingStatus = "pending";

