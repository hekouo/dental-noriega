import { z } from "zod";

const emailSchema = z.string().email();

/**
 * Valida si un email es válido antes de hacer la llamada a la API
 * @param value - Email a validar
 * @returns true si el email es válido, false en caso contrario
 */
export function isValidEmail(value: string | undefined | null): boolean {
  if (!value) return false;
  const parsed = emailSchema.safeParse(value.trim());
  return parsed.success;
}

