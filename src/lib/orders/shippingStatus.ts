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
  pending: "Pendiente",
  created: "Guía creada",
  in_transit: "En tránsito",
  ready_for_pickup: "Listo para recoger",
  delivered: "Entregado",
  canceled: "Cancelado",
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
 * Mapea un estado de envío a su label en español
 * @param status - Estado de envío (puede ser null o string no válido)
 * @returns Label en español o "Pendiente" como fallback
 */
export function mapStatusToLabel(
  status: string | null | undefined,
): string {
  if (!status || !isValidShippingStatus(status)) {
    return SHIPPING_STATUS_LABELS.pending;
  }
  return SHIPPING_STATUS_LABELS[status];
}

/**
 * Mapea un estado de envío a su variante de badge
 * @param status - Estado de envío (puede ser null o string no válido)
 * @returns Variante de color o "default" como fallback
 */
export function mapStatusToBadgeVariant(
  status: string | null | undefined,
): ShippingStatusVariant {
  if (!status || !isValidShippingStatus(status)) {
    return "default";
  }
  return SHIPPING_STATUS_VARIANTS[status];
}

/**
 * Mapea un estado de envío a una descripción amigable para el cliente
 * @param status - Estado de envío (puede ser null o string no válido)
 * @returns Descripción en español o "Pendiente" como fallback
 */
export function mapStatusToDescription(
  status: string | null | undefined,
): string {
  if (!status || !isValidShippingStatus(status)) {
    return SHIPPING_STATUS_LABELS.pending;
  }
  return SHIPPING_STATUS_LABELS[status];
}

// Aliases para compatibilidad con código existente
export const getShippingStatusLabel = mapStatusToLabel;
export const getShippingStatusVariant = mapStatusToBadgeVariant;

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

