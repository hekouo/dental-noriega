// src/lib/validations/checkout.ts
import { z } from "zod";

/** Regex sencillos y útiles */
const phoneRegex = /^[0-9]{10,15}$/; // MX 10 dígitos, tolera internacionales
const zipRegex = /^[0-9]{4,10}$/; // Ajusta a /^[0-9]{5}$/ si quieres MX estricto
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/** Helpers: primero TRIM, luego validamos con refine */
const trimmed = z.string().transform((s) => s.trim());

const required = (msg: string) =>
  trimmed.refine((s) => s.length > 0, { message: msg });

const requiredRegex = (re: RegExp, msg: string) =>
  trimmed.refine((s) => re.test(s), { message: msg });

const emailNorm = z
  .string()
  .transform((s) => s.trim().toLowerCase())
  .refine((v) => emailRegex.test(v), {
    message: "Correo electrónico inválido",
  });

/** Dirección */
export const addressSchema = z.object({
  label: required("La etiqueta es requerida"),
  street: required("La calle es requerida"),
  ext_no: required("El número exterior es requerido"),
  int_no: trimmed.optional(),
  neighborhood: required("La colonia es requerida"),
  city: required("La ciudad es requerida"),
  state: required("El estado es requerido"),
  zip: requiredRegex(zipRegex, "C.P. inválido"),
  is_default: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

/** Contacto */
export const contactSchema = z.object({
  name: required("El nombre es requerido").refine((s) => s.length >= 2, {
    message: "El nombre es requerido",
  }),
  phone: requiredRegex(phoneRegex, "Teléfono inválido"),
  email: emailNorm,
});

export type ContactInput = z.infer<typeof contactSchema>;

export const FulfillmentMethod = z.enum(["shipping", "pickup"]);
export type FulfillmentMethod = z.infer<typeof FulfillmentMethod>;

/** Checkout */
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
