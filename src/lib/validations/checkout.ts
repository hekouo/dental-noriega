import { z } from "zod";

/** Regex útiles */
const phoneRegex = /^\d{10,15}$/; // MX 10, permite intl.
const zipRegex = /^\d{4,10}$/; // Cambia a /^\d{5}$/ si quieres MX estricto
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/** Helpers: trim + validaciones con refine para evitar el problema de ZodEffects */
const t = z.string().transform((s) => s.trim());
const req = (msg: string) => t.refine((s) => s.length > 0, { message: msg });
const reqRegex = (re: RegExp, msg: string) =>
  t.refine((s) => re.test(s), { message: msg });
const emailNorm = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .refine((v) => emailRegex.test(v), {
    message: "Correo electrónico inválido",
  });

/** ========== Dirección/Contacto/Checkout (modelo general) ========== */
export const addressSchema = z.object({
  label: req("La etiqueta es requerida"),
  street: req("La calle es requerida"),
  ext_no: req("El número exterior es requerido"),
  int_no: t.optional(),
  neighborhood: req("La colonia es requerida"),
  city: req("La ciudad es requerida"),
  state: req("El estado es requerido"),
  zip: reqRegex(zipRegex, "C.P. inválido"),
  is_default: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const contactSchema = z.object({
  name: req("El nombre es requerido").refine((s) => s.length >= 2, {
    message: "El nombre es requerido",
  }),
  phone: reqRegex(phoneRegex, "Teléfono inválido"),
  email: emailNorm,
});
export type ContactInput = z.infer<typeof contactSchema>;

export const FulfillmentMethod = z.enum(["shipping", "pickup"]);
export type FulfillmentMethod = z.infer<typeof FulfillmentMethod>;

export const checkoutSchema = z
  .object({
    fulfillment_method: FulfillmentMethod,
    address_id: z.string().optional(),
    pickup_location: z.string().optional(),
    contact: contactSchema,
    points_to_redeem: z.coerce.number().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillment_method === "shipping" && !data.address_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address_id"],
        message: "Selecciona una dirección para envío",
      });
    }
    if (data.fulfillment_method === "pickup" && !data.pickup_location) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pickup_location"],
        message: "Selecciona punto de recolección",
      });
    }
  });
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** ========== Esquemas del flujo MVP por pasos (compatibilidad con tus páginas) ========== */
export const DatosSchema = z.object({
  fullName: req("Nombre requerido").refine((s) => s.length >= 3, {
    message: "Nombre demasiado corto",
  }),
  email: emailNorm,
  phone: reqRegex(phoneRegex, "Teléfono inválido"),
  street: req("Calle requerida"),
  extNumber: req("No. exterior requerido"),
  intNumber: t.optional(),
  neighborhood: req("Colonia requerida"),
  postalCode: reqRegex(zipRegex, "C.P. inválido"),
  city: req("Ciudad requerida"),
  state: req("Estado requerido"),
  notes: t
    .refine((s) => s.length <= 300, { message: "Máximo 300 caracteres" })
    .optional(),
});
export type DatosInput = z.infer<typeof DatosSchema>;

export const PagoSchema = z.object({
  method: z.enum(["card-mock", "oxxo-mock", "transfer-mock"]),
  agree: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar términos" }),
  }),
});
export type PagoInput = z.infer<typeof PagoSchema>;
