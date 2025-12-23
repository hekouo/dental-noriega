/**
 * Módulo centralizado de estados canónicos para órdenes
 * 
 * Este módulo define los estados canónicos de payment_status y shipping_status,
 * con helpers para normalización, formateo y compatibilidad con valores legacy.
 */

// ============================================================================
// PAYMENT STATUS
// ============================================================================

/**
 * Estados canónicos de pago
 */
export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;

export type PaymentStatus = typeof PAYMENT_STATUSES[number];

/**
 * Etiquetas en español para cada estado de pago
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  refunded: "Reembolsado",
};

/**
 * Variantes de color para badges según el estado de pago
 */
export type PaymentStatusVariant = "info" | "warning" | "success" | "destructive" | "default";

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, PaymentStatusVariant> = {
  pending: "warning",
  paid: "success",
  failed: "destructive",
  refunded: "destructive",
};

/**
 * Mapa de compatibilidad legacy -> canónico (solo para UI, no modifica DB)
 */
const PAYMENT_STATUS_LEGACY_MAP: Record<string, PaymentStatus> = {
  // Variaciones de pending
  "Pendiente": "pending",
  "PENDIENTE": "pending",
  // Variaciones de paid
  "Pagado": "paid",
  "PAGADO": "paid",
  // Variaciones de failed
  "Fallido": "failed",
  "FALLIDO": "failed",
  // Variaciones de refunded
  "Reembolsado": "refunded",
  "REEMBOLSADO": "refunded",
  // Estados antiguos
  "canceled": "failed", // canceled -> failed
  "Cancelado": "failed",
  "CANCELADO": "failed",
};

/**
 * Normaliza un estado de pago a su valor canónico (solo para UI)
 * @param status - Estado a normalizar (puede ser legacy)
 * @returns Estado canónico o null si no se puede normalizar
 */
export function normalizePaymentStatus(
  status: string | null | undefined,
): PaymentStatus | null {
  if (!status) return null;
  
  const normalized = status.trim().toLowerCase();
  
  // Si ya es canónico, retornarlo
  if (PAYMENT_STATUSES.includes(normalized as PaymentStatus)) {
    return normalized as PaymentStatus;
  }
  
  // Buscar en mapa de legacy
  const legacy = PAYMENT_STATUS_LEGACY_MAP[status] || PAYMENT_STATUS_LEGACY_MAP[normalized];
  if (legacy) {
    return legacy;
  }
  
  return null;
}

/**
 * Formatea un estado de pago para UI
 * @param status - Estado de pago (puede ser null o legacy)
 * @returns Label en español o "Pendiente" como fallback
 */
export function formatPaymentStatus(
  status: string | null | undefined,
): string {
  const normalized = normalizePaymentStatus(status);
  if (!normalized) {
    return PAYMENT_STATUS_LABELS.pending;
  }
  return PAYMENT_STATUS_LABELS[normalized];
}

/**
 * Obtiene la variante de badge para un estado de pago
 * @param status - Estado de pago (puede ser null o legacy)
 * @returns Variante de color o "default" como fallback
 */
export function getPaymentStatusBadgeVariant(
  status: string | null | undefined,
): PaymentStatusVariant {
  const normalized = normalizePaymentStatus(status);
  if (!normalized) {
    return "default";
  }
  return PAYMENT_STATUS_VARIANTS[normalized];
}

/**
 * Valida si un string es un estado de pago canónico
 */
export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return PAYMENT_STATUSES.includes(status as PaymentStatus);
}

// ============================================================================
// SHIPPING STATUS
// ============================================================================

/**
 * Estados canónicos de envío
 */
export const SHIPPING_STATUSES = [
  "pending_shipment",
  "label_created",
  "in_transit",
  "delivered",
  "ready_for_pickup",
  "cancelled",
] as const;

export type ShippingStatus = typeof SHIPPING_STATUSES[number];

/**
 * Etiquetas en español para cada estado de envío
 */
export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  pending_shipment: "Pendiente de envío",
  label_created: "Guía generada",
  in_transit: "En tránsito",
  delivered: "Entregado",
  ready_for_pickup: "Listo para recoger en tienda",
  cancelled: "Envío cancelado",
};

/**
 * Variantes de color para badges según el estado de envío
 */
export type ShippingStatusVariant = "info" | "warning" | "success" | "destructive" | "default";

export const SHIPPING_STATUS_VARIANTS: Record<ShippingStatus, ShippingStatusVariant> = {
  pending_shipment: "warning",
  label_created: "info",
  in_transit: "info",
  delivered: "success",
  ready_for_pickup: "success",
  cancelled: "destructive",
};

/**
 * Mapa de compatibilidad legacy -> canónico (solo para UI, no modifica DB)
 */
const SHIPPING_STATUS_LEGACY_MAP: Record<string, ShippingStatus> = {
  // pending -> pending_shipment
  "pending": "pending_shipment",
  "Pendiente": "pending_shipment",
  "PENDIENTE": "pending_shipment",
  "Pendiente de envío": "pending_shipment",
  // created -> label_created
  "created": "label_created",
  "CREATED": "label_created",
  "Guía generada": "label_created",
  // in_transit (ya es canónico, pero por si acaso)
  "in_transit": "in_transit",
  "IN_TRANSIT": "in_transit",
  "En tránsito": "in_transit",
  // delivered (ya es canónico)
  "delivered": "delivered",
  "DELIVERED": "delivered",
  "Entregado": "delivered",
  // ready_for_pickup (ya es canónico)
  "ready_for_pickup": "ready_for_pickup",
  "READY_FOR_PICKUP": "ready_for_pickup",
  "Listo para recoger": "ready_for_pickup",
  "Listo para recoger en tienda": "ready_for_pickup",
  // canceled/cancelled -> cancelled
  "canceled": "cancelled",
  "CANCELED": "cancelled",
  "Cancelado": "cancelled",
  "CANCELADO": "cancelled",
  "cancelled": "cancelled",
  "CANCELLED": "cancelled",
};

/**
 * Normaliza un estado de envío a su valor canónico (solo para UI)
 * @param status - Estado a normalizar (puede ser legacy)
 * @returns Estado canónico o null si no se puede normalizar
 */
export function normalizeShippingStatus(
  status: string | null | undefined,
): ShippingStatus | null {
  if (!status) return null;
  
  const normalized = status.trim().toLowerCase();
  
  // Si ya es canónico, retornarlo
  if (SHIPPING_STATUSES.includes(normalized as ShippingStatus)) {
    return normalized as ShippingStatus;
  }
  
  // Buscar en mapa de legacy
  const legacy = SHIPPING_STATUS_LEGACY_MAP[status] || SHIPPING_STATUS_LEGACY_MAP[normalized];
  if (legacy) {
    return legacy;
  }
  
  return null;
}

/**
 * Formatea un estado de envío para UI
 * @param status - Estado de envío (puede ser null o legacy)
 * @returns Label en español o "Pendiente de envío" como fallback
 */
export function formatShippingStatus(
  status: string | null | undefined,
): string {
  const normalized = normalizeShippingStatus(status);
  if (!normalized) {
    return SHIPPING_STATUS_LABELS.pending_shipment;
  }
  return SHIPPING_STATUS_LABELS[normalized];
}

/**
 * Obtiene la variante de badge para un estado de envío
 * @param status - Estado de envío (puede ser null o legacy)
 * @returns Variante de color o "default" como fallback
 */
export function getShippingStatusBadgeVariant(
  status: string | null | undefined,
): ShippingStatusVariant {
  const normalized = normalizeShippingStatus(status);
  if (!normalized) {
    return "default";
  }
  return SHIPPING_STATUS_VARIANTS[normalized];
}

/**
 * Valida si un string es un estado de envío canónico
 */
export function isValidShippingStatus(status: string): status is ShippingStatus {
  return SHIPPING_STATUSES.includes(status as ShippingStatus);
}

/**
 * Estado por defecto para nuevas órdenes
 */
export const DEFAULT_PAYMENT_STATUS: PaymentStatus = "pending";
export const DEFAULT_SHIPPING_STATUS: ShippingStatus = "pending_shipment";

