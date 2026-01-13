import { z } from "zod";
import { normalizeToMx10, isValidMx10 } from "@/lib/phone/mx";

// Regex para validaciones MX
// eslint-disable-next-line sonarjs/slow-regex -- patrón simple validación email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

// Helper: trim + validación
const t = z.string().transform((s) => s.trim());
const req = (msg: string) => t.refine((s) => s.length > 0, { message: msg });


// Estados de México (lista básica)
export const MX_STATES = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
] as const;

/**
 * Schema para el formulario de datos de envío
 */
export const datosSchema = z.object({
  name: req("Este campo es obligatorio").refine((s) => s.length >= 2, {
    message: "El nombre debe tener al menos 2 caracteres",
  }),
  last_name: req("Este campo es obligatorio").refine((s) => s.length >= 2, {
    message: "El apellido debe tener al menos 2 caracteres",
  }),
  email: z.string().transform((s) => s.trim().toLowerCase()).refine((v) => v.length > 0, {
    message: "Este campo es obligatorio",
  }).refine((v) => emailRegex.test(v), {
    message: "Ingresa un correo electrónico válido",
  }),
  phone: z
    .string()
    .transform((v) => {
      // Normalizar a 10 dígitos MX (limpia +52, espacios, etc.)
      return normalizeToMx10(v);
    })
    .refine((v) => isValidMx10(v), { message: "Ingresa un teléfono de 10 dígitos" }),
  whatsappConfirmed: z.boolean().optional().default(false),
  address: req("Este campo es obligatorio").refine((s) => s.length >= 5, {
    message: "La dirección debe tener al menos 5 caracteres",
  }),
  neighborhood: req("Este campo es obligatorio"),
  city: req("Este campo es obligatorio"),
  state: req("Este campo es obligatorio"),
  cp: z.string().regex(/^\d{5}$/, { message: "Ingresa un código postal de 5 dígitos" }),
  notes: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length <= 300, { message: "Máximo 300 caracteres permitidos" })
    .optional(),
  aceptaAviso: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar el contrato de compra y el aviso de privacidad para continuar" }),
  }),
});

export type DatosForm = z.infer<typeof datosSchema>;
