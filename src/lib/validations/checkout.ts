import { z } from 'zod'

export const addressSchema = z.object({
  label: z.string().min(1, 'La etiqueta es requerida'),
  street: z.string().min(1, 'La calle es requerida'),
  ext_no: z.string().min(1, 'El número exterior es requerido'),
  int_no: z.string().optional(),
  neighborhood: z.string().min(1, 'La colonia es requerida'),
  city: z.string().min(1, 'La ciudad es requerida'),
  state: z.string().min(1, 'El estado es requerido'),
  zip: z.string().min(5, 'El código postal debe tener al menos 5 dígitos'),
  is_default: z.boolean().optional(),
})

export const contactSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos'),
  email: z.string().email('Correo electrónico inválido'),
})

export const checkoutSchema = z.object({
  fulfillment_method: z.enum(['shipping', 'pickup']),
  address_id: z.string().optional(),
  pickup_location: z.string().optional(),
  contact: contactSchema,
  points_to_redeem: z.number().min(0).default(0),
})

export type AddressInput = z.infer<typeof addressSchema>
export type ContactInput = z.infer<typeof contactSchema>
export type CheckoutInput = z.infer<typeof checkoutSchema>

