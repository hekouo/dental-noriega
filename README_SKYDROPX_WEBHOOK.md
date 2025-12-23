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

### Eventos Soportados

El webhook mapea los siguientes eventos de Skydropx a estados canónicos:

- `picked_up` / `in_transit` → `in_transit`
- `delivered` → `delivered`
- `exception` / `cancelled` / `canceled` → `cancelled`
- `label_created` / `created` → `label_created`

### Estructura del Payload

El webhook espera un payload JSON con al menos:

```json
{
  "event_type": "delivered",
  "order_id": "uuid-de-la-orden",
  "tracking_number": "ABC123456789",
  "status": "delivered"
}
```

### Seguridad

El webhook valida:
- Header `x-skydropx-secret` o `Authorization` con el valor de `SKYDROPX_WEBHOOK_SECRET`
- En desarrollo, si no hay secret configurado, permite el request pero loguea un warning

### Testing Manual

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

## Fallback: Polling Script

Si Skydropx no soporta webhooks, puedes usar el script de polling:

**Archivo:** `scripts/sync-skydropx-tracking.ts`

### Uso con Vercel Cron

Agrega a `vercel.json`:

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

Crea `src/app/api/cron/sync-skydropx/route.ts`:

```typescript
import { syncSkydropxTracking } from "@/scripts/sync-skydropx-tracking";

export async function GET() {
  await syncSkydropxTracking();
  return Response.json({ ok: true });
}
```

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

```bash
pnpm tsx scripts/sync-skydropx-tracking.ts
```

El script:
- Busca órdenes con `shipping_provider='skydropx'` y estados `label_created` o `in_transit`
- Consulta el tracking en Skydropx API
- Actualiza `shipping_status` si cambió

