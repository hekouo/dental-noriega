/**
 * Helpers para verificar flags de habilitación de emails
 * Separados para no afectar el flujo existente de password reset
 */

/**
 * Verifica si EMAIL_ENABLED está habilitado
 * Usado por el flujo existente de password reset y otros emails transaccionales
 */
export function isEmailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true";
}

/**
 * Verifica si los emails de pedidos están habilitados
 * Requiere tanto EMAIL_ENABLED como ORDER_EMAIL_ENABLED en "true"
 * Si ORDER_EMAIL_ENABLED no existe, retorna false (default seguro)
 */
export function isOrderEmailEnabled(): boolean {
  return (
    isEmailEnabled() &&
    process.env.ORDER_EMAIL_ENABLED === "true" &&
    !!process.env.RESEND_API_KEY &&
    !!process.env.EMAIL_FROM
  );
}
