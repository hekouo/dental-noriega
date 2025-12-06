/**
 * Métodos de pago disponibles para órdenes
 */
export type PaymentMethod = "card" | "bank_transfer";

/**
 * Estados de pago para órdenes
 */
export type PaymentStatus = "pending" | "paid" | "canceled";

/**
 * Etiquetas en español para cada método de pago
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Tarjeta de crédito/débito",
  bank_transfer: "Transferencia / Depósito",
};

/**
 * Etiquetas en español para cada estado de pago
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  canceled: "Cancelado",
};

/**
 * Variantes de color para badges según el estado de pago
 */
export type PaymentStatusVariant = "info" | "warning" | "success" | "destructive" | "default";

export const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, PaymentStatusVariant> = {
  pending: "warning",
  paid: "success",
  canceled: "destructive",
};

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
 * Obtiene el label de un estado de pago
 * @param status - Estado de pago (puede ser null o string no válido)
 * @returns Label en español o "Pendiente" como fallback
 */
export function getPaymentStatusLabel(
  status: string | null | undefined,
): string {
  if (!status || !isValidPaymentStatus(status)) {
    return PAYMENT_STATUS_LABELS.pending;
  }
  return PAYMENT_STATUS_LABELS[status];
}

/**
 * Obtiene la variante de color para un estado de pago
 * @param status - Estado de pago (puede ser null o string no válido)
 * @returns Variante de color o "default" como fallback
 */
export function getPaymentStatusVariant(
  status: string | null | undefined,
): PaymentStatusVariant {
  if (!status || !isValidPaymentStatus(status)) {
    return "default";
  }
  return PAYMENT_STATUS_VARIANTS[status];
}

/**
 * Valida si un string es un método de pago válido
 * @param method - String a validar
 * @returns true si es un método válido
 */
export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return method in PAYMENT_METHOD_LABELS;
}

/**
 * Valida si un string es un estado de pago válido
 * @param status - String a validar
 * @returns true si es un estado válido
 */
export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return status in PAYMENT_STATUS_LABELS;
}

/**
 * Estado por defecto para nuevas órdenes con métodos de pago manuales
 */
export const DEFAULT_PAYMENT_STATUS: PaymentStatus = "pending";

