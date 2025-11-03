import { z } from "zod";

// Regex para validaciones MX
// eslint-disable-next-line sonarjs/slow-regex -- patrón simple validación email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

// Helper: trim + validación
const t = z.string().transform((s) => s.trim());
const req = (msg: string) => t.refine((s) => s.length > 0, { message: msg });

const emailNorm = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .refine((v) => emailRegex.test(v), {
    message: "Correo electrónico inválido",
  });

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
  name: req("El nombre es requerido").refine((s) => s.length >= 2, {
    message: "El nombre debe tener al menos 2 caracteres",
  }),
  last_name: req("El apellido es requerido").refine((s) => s.length >= 2, {
    message: "El apellido debe tener al menos 2 caracteres",
  }),
  email: emailNorm,
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, "")) // Solo números, permite espacios
    .refine((v) => v.length === 10, { message: "Teléfono a 10 dígitos" }),
  address: req("La dirección es requerida").refine((s) => s.length >= 5, {
    message: "La dirección debe tener al menos 5 caracteres",
  }),
  neighborhood: req("La colonia es requerida"),
  city: req("La ciudad es requerida"),
  state: req("El estado es requerido"),
  cp: z.string().regex(/^\d{5}$/, { message: "CP de 5 dígitos" }),
  notes: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length <= 300, { message: "Máximo 300 caracteres" })
    .optional(),
  aceptaAviso: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar el aviso de privacidad" }),
  }),
});

export type DatosForm = z.infer<typeof datosSchema>;
