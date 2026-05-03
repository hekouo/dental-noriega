# PR-S2.1 Hotfix: Pickup UI en “Entrega del paquete”

## Qué cambió

- Se corrigió `ShippingHandoffClient` para que el click en **“Programar recolección (Pickup)”** ya no sea no-op:
  - Primer click: abre panel/form inline visible y muestra estado inmediato (“Abriendo formulario...”).
  - Si ya existe `pickup_id`, no abre form y muestra mensaje de que ya está programado.
  - Confirmación: al volver a presionar en el panel, envía POST a `/api/admin/shipping/skydropx/pickups` con loading “Programando...”.
- Manejo de errores de pickup visible en UI:
  - Muestra mensaje en rojo con `status + message` devueltos por backend.
- Se mantiene UX de drop-off y se agrega instrucción clara:
  - “Entrega el paquete en cualquier sucursal/punto autorizado de {provider}. Lleva la guía impresa.”
  - Link “Buscar sucursales”:
    - Coordinadora: link oficial de Coordinadora.
    - Otros: búsqueda Google `sucursales {provider}`.

## QA obligatorio

1. Click en **“Programar recolección”** abre el form (ya no falla silenciosamente).
2. Submit genera request visible en Network a `/api/admin/shipping/skydropx/pickups`.
3. Domingo bloqueado.
4. Drop-off muestra instrucciones + link de sucursales.

