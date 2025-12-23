# Configuración de Webhook Skydropx

## Webhook Endpoint

**URL:** `POST /api/shipping/skydropx/webhook`

### Configuración en Skydropx

1. Ve a tu dashboard de Skydropx
2. Configura el webhook para que apunte a: `https://tu-dominio.com/api/shipping/skydropx/webhook`
3. Configura el secret del webhook en variables de entorno:
   ```
   SKYDROPX_WEBHOOK_SECRET=tu_secret_aqui
   ```

### Eventos y Estados Soportados

El webhook mapea los siguientes eventos/estados de Skydropx a estados canónicos:

- `created` / `label_created` → `label_created`
- `picked_up` / `in_transit` / `last_mile` → `in_transit`
- `delivered` → `delivered`
- `delivered_to_branch` → `ready_for_pickup`
- `exception` / `cancelled` / `canceled` / `in_return` → `cancelled`

### Estructura del Payload

El webhook soporta múltiples formatos de payload:

#### Formato Simple (Legacy)

```json
{
  "event_type": "delivered",
  "order_id": "uuid-de-la-orden",
  "tracking_number": "ABC123456789",
  "status": "delivered"
}
```

#### Formato JSON:API

```json
{
  "type": "shipment",
  "data": {
    "id": "shipment_ext_id_123",
    "type": "shipment",
    "attributes": {
      "status": "delivered",
      "tracking_number": "ABC123456789"
    }
  }
}
```

### Resolución de Orden

El webhook resuelve la orden con esta prioridad:

1. **order_id** (UUID interno) → busca por `orders.id`
2. **shipment_id** (data.id o shipment_id) → busca por `orders.shipping_rate_ext_id`
3. **tracking_number** → busca por `orders.shipping_tracking_number`

Si no se encuentra la orden, responde `200 { received: true, message: "No matching order" }` (no error 500).

### Seguridad

El webhook valida:
- Header `x-skydropx-secret` o `Authorization` con el valor de `SKYDROPX_WEBHOOK_SECRET`
- En desarrollo, si no hay secret configurado, permite el request pero loguea un warning

### Testing Manual

#### Ejemplo 1: Con order_id (UUID)

```bash
curl -X POST https://tu-dominio.com/api/shipping/skydropx/webhook \
  -H "Content-Type: application/json" \
  -H "x-skydropx-secret: tu_secret" \
  -d '{
    "event_type": "delivered",
    "order_id": "uuid-de-orden-existente",
    "tracking_number": "ABC123",
    "status": "delivered"
  }'
```

#### Ejemplo 2: Con shipment_id (recomendado)

```bash
curl -X POST https://tu-dominio.com/api/shipping/skydropx/webhook \
  -H "Content-Type: application/json" \
  -H "x-skydropx-secret: tu_secret" \
  -d '{
    "data": {
      "id": "shipment_ext_id_123",
      "attributes": {
        "status": "delivered",
        "tracking_number": "ABC123456789"
      }
    }
  }'
```

#### Ejemplo 3: Con tracking_number

```bash
curl -X POST https://tu-dominio.com/api/shipping/skydropx/webhook \
  -H "Content-Type: application/json" \
  -H "x-skydropx-secret: tu_secret" \
  -d '{
    "event_type": "in_transit",
    "tracking_number": "ABC123456789",
    "status": "picked_up"
  }'
```

## Fallback: Polling Script (Cron Endpoint)

Si Skydropx no soporta webhooks, puedes usar el endpoint de cron que ejecuta el script de polling:

**Endpoint:** `GET /api/cron/sync-skydropx`

### Configuración en Vercel

El archivo `vercel.json` ya incluye la configuración del cron (cada 6 horas):

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-skydropx",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Variables de Entorno Requeridas

Para que el cron funcione, necesitas configurar:

```env
# Secret para proteger el endpoint (requerido en producción)
CRON_SECRET=tu_secret_aqui

# Skydropx (ya deberías tenerlas)
SKYDROPX_CLIENT_ID=tu_client_id
SKYDROPX_CLIENT_SECRET=tu_client_secret

# Supabase (ya deberías tenerlas)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Seguridad

El endpoint está protegido con `CRON_SECRET`:
- Vercel Cron automáticamente agrega el header `x-cron-secret` con el valor de `CRON_SECRET`
- En desarrollo, si no hay secret configurado, permite el request pero loguea un warning
- Para llamadas manuales, incluir header: `x-cron-secret: tu_secret`

### Uso con GitHub Actions

Crea `.github/workflows/sync-skydropx.yml`:

```yaml
name: Sync Skydropx Tracking
on:
  schedule:
    - cron: '0 */6 * * *'  # Cada 6 horas
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: pnpm install
      - run: pnpm tsx scripts/sync-skydropx-tracking.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          SKYDROPX_CLIENT_ID: ${{ secrets.SKYDROPX_CLIENT_ID }}
          SKYDROPX_CLIENT_SECRET: ${{ secrets.SKYDROPX_CLIENT_SECRET }}
```

### Uso Manual

#### Opción 1: Llamar al endpoint (recomendado)

```bash
curl -X GET https://tu-dominio.com/api/cron/sync-skydropx \
  -H "x-cron-secret: tu_secret"
```

#### Opción 2: Ejecutar script directamente

```bash
pnpm tsx scripts/sync-skydropx-tracking.ts
```

### Funcionamiento

El script/endpoint:
- Busca órdenes con `shipping_provider='skydropx'` y estados `label_created` o `in_transit`
- Consulta el tracking en Skydropx API
- Actualiza `shipping_status` si cambió
- Limita a 50 órdenes por ejecución para no sobrecargar la API

