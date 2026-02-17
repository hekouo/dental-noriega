# Estado del bloque WhatsApp (H10–H12)

Resumen de lo implementado, metadata, pantallas que lo usan y limitaciones.

---

## Qué se implementó (H10–H12)

- **PR-H10** – UX en checkout/datos: checkbox "Este es mi número de WhatsApp", texto helper, persistencia de `metadata.whatsapp_confirmed` (boolean). Opcional en admin: badge "WhatsApp confirmado: Sí/No" en detalle de pedido.
- **PR-H11** – Links de WhatsApp con mensaje prellenado: helper `normalizePhoneMX` y `buildWhatsAppUrl` en `src/lib/whatsapp/format.ts`. Home (FinalCTA, HeroIntro) y pago-pendiente usan mensaje de asesor/comprobante; guard rails: link siempre al número DDN (soporte), no al cliente; hint "Confirma tu WhatsApp en checkout para seguimiento" cuando no confirmado en pago-pendiente.
- **PR-H12** – Persistencia de `metadata.whatsapp_wa_digits`: solo si confirmado + teléfono válido (formato "52" + 10 dígitos vía `normalizePhoneMX`). create-order y save-order (GraciasContent) escriben/leen estos campos; si teléfono inválido o no confirmado, `whatsapp_confirmed = false` y `whatsapp_wa_digits` ausente.

---

## Metadata en `order.metadata`

| Campo | Tipo | Cuándo se guarda |
|-------|------|-------------------|
| `whatsapp_confirmed` | boolean | Siempre. `true` solo si el usuario marcó el checkbox y el teléfono normaliza a "52"+10 dígitos; si no, `false`. |
| `whatsapp_wa_digits` | string | Solo si `whatsapp_confirmed === true` y teléfono válido: valor "52" + 10 dígitos (MX). Si no confirmado o teléfono inválido, no se incluye (o se omite en el objeto final). |

Otros campos de WhatsApp ya existentes (referencia, no modificados por H10–H12): `whatsapp_raw`, `whatsapp_digits10`, `whatsapp_e164`, etc.

---

## Pantallas que lo usan

- **Home** – FinalCTA y HeroIntro: CTA "Habla con un asesor" / WhatsApp. Link siempre al número DDN con mensaje prellenado ("Hola, necesito ayuda con mi compra en DDN."). No usan número del cliente.
- **Checkout / datos** – Formulario con checkbox "Este es mi número de WhatsApp"; valor se envía al crear/actualizar orden.
- **Pago pendiente** – Bloque WhatsApp (OrderWhatsAppBlock): link a DDN con mensaje de comprobante + orderRef. Si `whatsapp_confirmed === false`, se muestra el hint "Confirma tu WhatsApp en checkout para seguimiento". Link siempre a DDN.
- **Admin / pedidos / [id]** – Muestra "WhatsApp confirmado: Sí/No" cuando existe `metadata.whatsapp_confirmed`.
- **Cuenta / pedidos** – Puede usar `metadata.whatsapp_wa_digits` para el bloque de WhatsApp del pedido (mismo patrón: link a DDN, no al cliente).

---

## Guard rails (verificado en repo)

- Los links de WhatsApp (wa.me) en Home y pago-pendiente usan **siempre el número de soporte DDN** (`getWhatsAppPhone()` / `buildWhatsAppOrderUrl` con teléfono DDN). No se usa el número del cliente como destino del link aunque exista `whatsapp_wa_digits`.
- Si no hay confirmación o teléfono inválido: `whatsapp_confirmed = false` y `whatsapp_wa_digits` no se persiste (create-order y save-order).

---

## Limitaciones actuales

- No hay verificación real de que "es su WhatsApp" (p. ej. OTP o verificación por mensaje). Solo confirmación UX: el usuario marca el checkbox y se valida que el teléfono sea un número MX válido de 10 dígitos.

---

## Próximos pasos sugeridos (opcional)

- WhatsApp Business API / templates para mensajes por evento (confirmación de pedido, aviso de envío, etc.).
- Mensajes automáticos por evento (orden creada, pago recibido, envío despachado) respetando preferencias y evitando spam.
- Política de uso y frecuencia para no saturar al cliente.
