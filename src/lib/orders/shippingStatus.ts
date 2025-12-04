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
 * Labels en español para cada estado de envío
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
 * Obtiene el label legible para un estado de envío
 * @param status - Estado de envío (puede ser null, undefined o string)
 * @returns Label en español o "Pendiente de envío" como fallback
 */
export function getShippingStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return SHIPPING_STATUS_LABELS.pending;
  }

  // Validar que el status sea uno de los estados canónicos
  if (status in SHIPPING_STATUS_LABELS) {
    return SHIPPING_STATUS_LABELS[status as ShippingStatus];
  }

  // Si no es un estado canónico, devolver el valor original o fallback
  return status || SHIPPING_STATUS_LABELS.pending;
}

/**
 * Obtiene la variante de color para un estado de envío
 * @param status - Estado de envío (puede ser null, undefined o string)
 * @returns Variante de color o "default" como fallback
 */
export function getShippingStatusVariant(
  status: string | null | undefined,
): ShippingStatusVariant {
  if (!status) {
    return SHIPPING_STATUS_VARIANTS.pending;
  }

  if (status in SHIPPING_STATUS_VARIANTS) {
    return SHIPPING_STATUS_VARIANTS[status as ShippingStatus];
  }

  return "default";
}

/**
 * Valida si un string es un estado de envío válido
 */
export function isValidShippingStatus(status: string | null | undefined): status is ShippingStatus {
  if (!status) return false;
  return status in SHIPPING_STATUS_LABELS;
}

