/**
 * Re-exportaciones desde el módulo centralizado de estados
 * 
 * Este archivo mantiene compatibilidad hacia atrás mientras migramos
 * al módulo centralizado src/lib/orders/statuses.ts
 */

export {
  type ShippingStatus,
  SHIPPING_STATUSES,
  SHIPPING_STATUS_LABELS,
  type ShippingStatusVariant,
  SHIPPING_STATUS_VARIANTS,
  formatShippingStatus as getShippingStatusLabel,
  getShippingStatusBadgeVariant as getShippingStatusVariant,
  isValidShippingStatus,
  normalizeShippingStatus,
  DEFAULT_SHIPPING_STATUS,
} from "./statuses";

