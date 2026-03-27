# PR-S2: Admin Pickup (Skydropx) + horarios por día

## Objetivo

Habilitar **Pickup (recolección a domicilio)** desde Admin (detalle de pedido), complementando PR-S1 (drop-off), usando Skydropx API y persistiendo en:

`metadata.shipping.handoff.pickup`

## Qué cambió

### UI Admin

Archivo: `src/app/admin/pedidos/[id]/ShippingHandoffClient.tsx`

- Se habilita opción funcional **Programar recolección (Pickup)**.
- Form inline con:
  - Fecha
  - Hora desde / hasta
  - # paquetes (default 1)
  - Peso total kg (default desde `metadata.shipping.package_used.weight_g / 1000`)
  - Notas opcionales
- Validaciones:
  - Domingo bloqueado (`Domingo no disponible`)
  - `scheduled_to > scheduled_from`
- Si ya existe `pickup_id`, muestra estado **Recolección programada** y no permite duplicar.
- Mantiene opción drop-off existente.

### Endpoint server-only

Archivo: `src/app/api/admin/shipping/skydropx/pickups/route.ts`

- `POST /api/admin/shipping/skydropx/pickups`
- Auth: `checkAdminAccess()`
- Service role para leer/actualizar orden.
- Requiere `shipment_id` (columna o metadata); si no existe: 400.
- Si ya hay `pickup_id` en metadata: 409.
- Llama a Skydropx con `skydropxFetch("/api/v1/pickups", ...)`.
- Persiste:
  - `mode="pickup"`
  - `selected_at=now`
  - `pickup: { pickup_id, scheduled_from, scheduled_to, packages, total_weight_kg, status:"scheduled", raw:{} }`

### Config de origen fijo (server-only)

Archivo: `src/lib/shipping/pickupOrigin.ts`

- Lee origen de pickup desde env vars.
- Si faltan valores críticos responde con:
  - `Pickup origin no configurado`

## Env vars necesarias

- `PICKUP_NAME`
- `PICKUP_PHONE`
- `PICKUP_EMAIL`
- `PICKUP_ADDRESS1`
- `PICKUP_ADDRESS2` (opcional)
- `PICKUP_CITY`
- `PICKUP_STATE`
- `PICKUP_POSTAL_CODE`
- `PICKUP_COUNTRY` (opcional, default `MX`)

## Cálculo de horario default

En UI, al elegir fecha:
- **Lunes a Viernes:** 08:00–17:00
- **Sábado:** 08:00–15:00
- **Domingo:** bloqueado

## QA manual

1. Crear guía (shipment_id/label).
2. Programar pickup L–V: defaults 08:00–17:00.
3. Programar pickup Sábado: defaults 08:00–15:00.
4. Intentar Domingo: debe bloquear.
5. Refrescar página: `pickup_id` y ventana persisten.

## Confirmación de alcance

- No se tocó `src/app/checkout/**`.
- No se modificó SQL ni RLS.
- No se tocaron create-label/cancel existentes.

