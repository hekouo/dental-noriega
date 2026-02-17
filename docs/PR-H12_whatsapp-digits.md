# PR-H12: Persistir whatsapp_wa_digits en order.metadata al confirmar WhatsApp

## Objetivo
Al marcar "Este es mi número de WhatsApp" en /checkout/datos, persistir en `order.metadata`:
- `whatsapp_confirmed`: true solo si hay teléfono válido y confirmado.
- `whatsapp_wa_digits`: string "52" + 10 dígitos (normalizePhoneMX). Si no confirmado o digits null, no incluir o false.

Sin tocar Stripe, envíos, admin ni APIs ajenas a checkout/metadata.

## Archivos tocados
- `src/app/api/checkout/create-order/route.ts` – Usa `normalizePhoneMX(phone)` cuando `whatsappConfirmed`; `whatsapp_wa_digits` = digits o undefined; degrada a `whatsapp_confirmed: false` si digits es null.
- `src/app/api/checkout/save-order/route.ts` – Schema con `whatsappWaDigits` opcional; metadata `whatsapp_wa_digits` solo si confirmado y hay digits (payload o metadata existente).
- `src/app/checkout/gracias/GraciasContent.tsx` – Al llamar save-order, calcula `waDigits = normalizePhoneMX(phone)` si confirmado y envía `whatsappConfirmed` y `whatsappWaDigits` en el body.

## QA checklist
- [ ] `pnpm -s verify` exit 0.
- [ ] /checkout/datos: phone 10 dígitos, checkbox confirmado → crear orden → metadata con `whatsapp_confirmed: true` y `whatsapp_wa_digits: "52..."`.
- [ ] /checkout/datos: confirm=false → metadata `whatsapp_confirmed: false` y sin `whatsapp_wa_digits`.
- [ ] Phone inválido + confirm=true → metadata `whatsapp_confirmed: false` (sin crash).

## Confirmación
No se tocó: Stripe, webhooks, envíos, admin, otras APIs. Solo create-order, save-order y GraciasContent (payload save-order).
