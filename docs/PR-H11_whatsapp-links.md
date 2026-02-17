# PR-H11: WhatsApp link + mensaje prellenado (metadata.whatsapp_confirmed)

## Objetivo
Usar `buildWhatsAppUrl` y mensajes prellenados para CTAs de WhatsApp; mostrar hint cuando `whatsapp_confirmed === false` en pago-pendiente. Sin tocar Stripe/webhooks/envíos/admin APIs.

## Archivos tocados
- `src/lib/whatsapp/format.ts` (nuevo) – `normalizePhoneMX(input)`, `buildWhatsAppUrl({ phoneE164OrMX, text })`
- `src/components/home/FinalCTA.tsx` – URL con `buildWhatsAppUrl`, texto asesor "Hola, necesito ayuda con mi compra en DDN.", aria-label, focus-premium
- `src/components/home/HeroIntro.tsx` – mismo mensaje asesor, `buildWhatsAppUrl`, aria-label, focus-premium
- `src/components/checkout/OrderWhatsAppBlock.tsx` – prop `whatsappConfirmed`; hint "Confirma tu WhatsApp en checkout para seguimiento" cuando false en pending; aria-label y focus-premium en link
- `src/app/checkout/pago-pendiente/PagoPendienteClient.tsx` – pasar `whatsapp_confirmed` y `whatsapp_wa_digits` desde metadata a `OrderWhatsAppBlock`

## QA checklist
- [ ] `pnpm -s verify` exit 0
- [ ] En `/checkout/datos`: confirmar WhatsApp true, completar flujo hasta pago-pendiente
- [ ] En `/checkout/pago-pendiente`: botón WhatsApp abre wa.me con texto prellenado (comprobante + orderId)
- [ ] Home CTA "Habla con un asesor" / FinalCTA WhatsApp: abre wa.me con texto "Hola, necesito ayuda con mi compra en DDN."
- [ ] Si `whatsapp_confirmed === false` en pago-pendiente: se muestra hint "Confirma tu WhatsApp en checkout para seguimiento"; link sigue siendo a DDN

## Confirmación
**No se tocó:** pagos, Stripe, webhooks, envíos, admin, APIs. Solo helpers de WhatsApp, CTAs en Home/FinalCTA y bloque WhatsApp en pago-pendiente (link + hint).
