/**
 * Métodos de pago disponibles para órdenes
 */
export type PaymentMethod = "card" | "bank_transfer";

/**
 * Etiquetas en español para cada método de pago
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Tarjeta de crédito/débito",
  bank_transfer: "Transferencia / Depósito",
};

/**
 * Re-exportaciones desde el módulo centralizado de estados
 * 
 * Este archivo mantiene compatibilidad hacia atrás mientras migramos
 * al módulo centralizado src/lib/orders/statuses.ts
 */

export {
  type PaymentStatus,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  type PaymentStatusVariant,
  PAYMENT_STATUS_VARIANTS,
  formatPaymentStatus as getPaymentStatusLabel,
  getPaymentStatusBadgeVariant as getPaymentStatusVariant,
  isValidPaymentStatus,
  normalizePaymentStatus,
  DEFAULT_PAYMENT_STATUS,
} from "./statuses";

/**
 * Obtiene el label de un método de pago
 * @param method - Método de pago (puede ser null o string no válido)
 * @returns Label en español o el método original como fallback
 */
export function getPaymentMethodLabel(
  method: string | null | undefined,
): string {
  if (!method || !isValidPaymentMethod(method)) {
    return method || "N/A";
  }
  return PAYMENT_METHOD_LABELS[method];
}

/**
 * Valida si un string es un método de pago válido
 * @param method - String a validar
 * @returns true si es un método válido
 */
export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return method in PAYMENT_METHOD_LABELS;
}

