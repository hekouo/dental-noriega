# PR-S1: Admin — Drop-off handoff (“Entrega del paquete”)

## Objetivo

Agregar en el detalle de pedido (Admin) la sección **“Entrega del paquete”** para manejar **DROP-OFF** (el admin/operación entrega el paquete en sucursal) y persistir estado en:

`orders.metadata.shipping.handoff`

> En este PR **no** se programa recolección (pickup). Solo drop-off + placeholder base.

## Data model (metadata)

Se añade/actualiza **solo** `metadata.shipping.handoff`:

```ts
{
  mode: "dropoff",
  selected_at: ISO,
  notes?: string,
  dropoff: {
    status: "pending_dropoff" | "dropped_off",
    location_name?: string,
    address?: string,
    dropped_off_at?: ISO
  }
}
```

## UI (Admin detalle de pedido)

Ubicación: `src/app/admin/pedidos/[id]/page.tsx`

Bloque **“Entrega del paquete”**:

- Se muestra **solo si ya existe guía/evidencia**:
  - `metadata.shipping.shipment_id` o `order.shipping_label_url` o `order.shipping_tracking_number`.
- Opciones:
  - **Drop-off** (funcional)
  - **Pickup** (placeholder “Disponible pronto”)
- Acciones Drop-off:
  1) **Usar Drop-off**:
     - `handoff.mode="dropoff"`
     - `handoff.selected_at=now()`
     - `handoff.dropoff.status="pending_dropoff"`
  2) **Notas / Sucursal** (textarea opcional) → guarda en `handoff.notes`
  3) **Marcar como entregado en sucursal**:
     - `handoff.dropoff.status="dropped_off"`
     - `handoff.dropoff.dropped_off_at=now()`
  4) Badge de estado:
     - Pending: “Pendiente de entrega en sucursal”
     - Dropped: “Entregado en sucursal”
  5) Accesos:
     - “Abrir guía” (label_url)
     - Tracking (tracking_number)

## API mínima (admin)

Se crea endpoint mínimo para persistir el estado sin sobrescribir todo metadata:

- `PATCH /api/admin/orders/[id]/metadata`
- Body:

```json
{
  "shipping_handoff_patch": {
    "mode": "dropoff",
    "selected_at": "2026-01-01T00:00:00.000Z",
    "notes": "Texto opcional",
    "dropoff": { "status": "pending_dropoff" }
  }
}
```

- Auth: `checkAdminAccess()`
- Supabase: Service role
- Merge profundo **solo** en `metadata.shipping.handoff` (no sobrescribe todo `metadata.shipping`).

## QA manual

1) Crear guía (Skydropx) en el pedido (como ya existe).
2) Ver que aparece **Entrega del paquete**.
3) Click **Usar Drop-off** → badge “Pendiente de entrega en sucursal”.
4) Escribir notas → **Guardar notas**.
5) Click **Marcar como entregado en sucursal** → badge “Entregado en sucursal”.
6) Recargar la página → el estado persiste.

## Confirmación de alcance

- No se tocó `src/app/checkout/**`.
- No se agregó SQL ni se tocaron policies.
- No se rompieron endpoints Skydropx create-label/cancel (sin cambios).

