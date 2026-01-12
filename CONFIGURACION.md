# Configuración Rápida del Proyecto

## 📦 Instalación

```bash
npm install
```

## 🔑 Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase (obtén estos valores en tu dashboard de Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (obtén estos valores en tu dashboard de Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Skydropx (envíos)
# IMPORTANTE: Este proyecto usa OAuth 2.0 (no API Key). Skydropx tiene documentación antigua
# con API Key y endpoints api.skydropx.com/v1/*, pero este proyecto usa OAuth exclusivamente.
# 
# NOTA CRÍTICA: Para PRO con OAuth, TODOS los endpoints deben usar api-pro.skydropx.com.
# NO usar api.skydropx.com (legacy) con OAuth, causará 401 "Bad credentials".

# OAuth: autenticación (grant_type=client_credentials)
SKYDROPX_CLIENT_ID=tu_client_id
SKYDROPX_CLIENT_SECRET=tu_client_secret
# URL base para OAuth (default: https://api-pro.skydropx.com)
SKYDROPX_AUTH_BASE_URL=https://api-pro.skydropx.com
# URL completa del endpoint OAuth (opcional, si no se especifica se construye desde AUTH_BASE_URL)
# El sistema intentará automáticamente:
#   1. ${SKYDROPX_AUTH_BASE_URL}/api/v1/oauth/token
#   2. ${SKYDROPX_AUTH_BASE_URL}/oauth/token
SKYDROPX_OAUTH_TOKEN_URL=https://api-pro.skydropx.com/api/v1/oauth/token  # Opcional

# Cotizaciones: obtener rates de envío (default: https://api-pro.skydropx.com)
SKYDROPX_QUOTATIONS_BASE_URL=https://api-pro.skydropx.com

# REST API: shipments y otros endpoints (default: https://api-pro.skydropx.com)
# IMPORTANTE: Para PRO con OAuth, debe ser api-pro.skydropx.com (NO api.skydropx.com legacy)
# El sistema intentará automáticamente:
#   1. ${SKYDROPX_BASE_URL}/api/v1/shipments
#   2. ${SKYDROPX_BASE_URL}/v1/shipments (fallback si 404)
SKYDROPX_BASE_URL=https://api-pro.skydropx.com

# Shipments: URL base específica para obtener tracking/label (default: usa SKYDROPX_BASE_URL)
# IMPORTANTE: Según documentación oficial de Skydropx (app.skydropx.com/es-MX/api-docs),
# para obtener tracking_number y label_url desde shipments, usar app.skydropx.com.
# OAuth token URL puede seguir siendo api-pro.skydropx.com, pero shipments debe ser app.skydropx.com
# para que la respuesta incluya included[].attributes.tracking_number y included[].attributes.label_url.
SKYDROPX_SHIPMENTS_BASE_URL=https://app.skydropx.com

# Carta Porte (SAT) - REQUERIDO para crear shipments/labels en Skydropx PRO
# consignment_note = código Carta Porte (SAT) del producto/servicio
# package_type = código de tipo de empaque (SAT)
# Ambos pueden depender de la paquetería/rate seleccionado y se obtienen del listado oficial de Skydropx.
# También pueden guardarse por orden en metadata.shipping.consignment_note / metadata.shipping.package_type
SKYDROPX_DEFAULT_CONSIGNMENT_NOTE=tu_codigo_carta_porte
SKYDROPX_DEFAULT_PACKAGE_TYPE=tu_codigo_tipo_empaque

# Datos de origen (requeridos para crear shipments)
SKYDROPX_ORIGIN_NAME=Depósito Dental Noriega
SKYDROPX_ORIGIN_STATE=Ciudad de México
SKYDROPX_ORIGIN_CITY=Ciudad de México
SKYDROPX_ORIGIN_POSTAL_CODE=01234
SKYDROPX_ORIGIN_ADDRESS_LINE_1=Calle Principal 123
SKYDROPX_ORIGIN_PHONE=5512345678
SKYDROPX_ORIGIN_EMAIL=envios@ddnshop.mx
# Colonia/barrio para area_level3 en Skydropx quotations (opcional)
# Si no se configura, se usa alcaldía detectada o address2
# Ejemplo para CP 14380: SKYDROPX_ORIGIN_AREA_LEVEL3=San Bartolo El Chico
SKYDROPX_ORIGIN_AREA_LEVEL3=
# Referencia para shipments (opcional, NO se usa en quotations)
SKYDROPX_ORIGIN_REFERENCE=

# Peso mínimo billable para Skydropx (default: 1000g = 1kg)
# Skydropx requiere/cobra mínimo 1kg para cotizaciones y envíos.
# Si el paquete pesa menos de 1kg, se ajustará automáticamente a 1kg para la cotización/creación de guía.
SKYDROPX_MIN_BILLABLE_WEIGHT_G=1000

# Peso por defecto por producto (default: 100g)
# Se usa cuando un producto no tiene shipping_weight_g registrado en la base de datos.
# Este valor se usa para calcular el peso estimado en checkout (suma de productos).
DEFAULT_ITEM_WEIGHT_G=100

# Webhook Secret de Skydropx (requerido para validar webhooks automáticos de tracking)
# Configura este secret en el dashboard de Skydropx → Webhooks → Configurar secret
# El webhook endpoint es: ${NEXT_PUBLIC_APP_URL}/api/shipping/skydropx/webhook
# El header de validación es: x-skydropx-secret
SKYDROPX_WEBHOOK_SECRET=tu_webhook_secret_aqui
```

## 📦 Skydropx - Webhooks y Tracking Automático

### Configuración del Webhook en Skydropx Dashboard

1. Ve a tu dashboard de Skydropx
2. Navega a **Configuración → Webhooks**
3. Agrega un nuevo webhook con:
   - **URL**: `${NEXT_PUBLIC_APP_URL}/api/shipping/skydropx/webhook`
   - **Secret**: Configura el mismo valor que `SKYDROPX_WEBHOOK_SECRET` en tu `.env.local`
   - **Eventos**: Selecciona los eventos que quieres recibir (recomendado: todos los relacionados con shipments)

### QA Checklist - Testing de Webhooks y Tracking

#### 1. Prueba del Webhook con curl (PowerShell)

```powershell
# Reemplaza estos valores:
$webhookSecret = "tu_secret_aqui"
$webhookUrl = "http://localhost:3000/api/shipping/skydropx/webhook"
$shipmentId = "shipment_id_de_prueba"
$orderId = "uuid_de_orden_en_supabase"

# Payload de ejemplo (formato JSON:API de Skydropx)
$body = @{
    data = @{
        id = "event_123"
        type = "shipment_event"
        attributes = @{
            status = "created"
            tracking_number = "TRACK123456"
            label_url = "https://example.com/label.pdf"
            updated_at = (Get-Date -Format "o")
        }
        relationships = @{
            shipment = @{
                data = @{
                    id = $shipmentId
                    type = "shipment"
                }
            }
        }
    }
} | ConvertTo-Json -Depth 10

# Enviar webhook
Invoke-RestMethod -Uri $webhookUrl -Method Post -Headers @{
    "x-skydropx-secret" = $webhookSecret
    "Content-Type" = "application/json"
} -Body $body

# Verificar respuesta (debe ser 200 con {received: true, message: "ok"})
```

#### 2. Caso: create-label → tracking_pending → sync-label → label_url aparece

**Pasos**:
1. Crear una orden y marcarla como pagada (`payment_status = "paid"`)
2. En Admin → Pedido → Click "Crear guía en Skydropx"
3. Verificar que:
   - El endpoint responde `ok: true` con `shipment_id`
   - La orden tiene `shipping_status = "label_pending_tracking"` (si tracking/label no están disponibles)
   - La orden tiene `shipping_shipment_id` guardado (columna + metadata)
4. Esperar 1-2 minutos o click "Actualizar tracking" (sync-label)
5. Verificar que:
   - `sync-label` devuelve `updated: true` si obtuvo tracking/label
   - La orden tiene `shipping_tracking_number` y/o `shipping_label_url` actualizados
   - `shipping_status` cambia a `"label_created"` si ambos están disponibles

**Validación en Supabase**:
```sql
SELECT id, shipping_shipment_id, shipping_tracking_number, shipping_label_url, shipping_status
FROM orders
WHERE id = '<order_id>';
```

#### 2.1. Test Manual: sync-label con order_id específico

**Objetivo**: Verificar que el endpoint `sync-label` obtiene y guarda `tracking_number` y `label_url` desde Skydropx.

**Pre-requisitos**:
1. Tener una orden con `shipping_shipment_id` guardado (ej: después de `create-label`)
2. La orden debe tener `shipping_tracking_number` y/o `shipping_label_url` en NULL inicialmente

**Pasos**:

1. **Verificar orden en Supabase**:
```sql
-- En Supabase SQL Editor, buscar orden con shipping_shipment_id pero sin tracking/label
SELECT id, shipping_shipment_id, shipping_tracking_number, shipping_label_url, shipping_status
FROM orders
WHERE shipping_shipment_id IS NOT NULL
  AND (shipping_tracking_number IS NULL OR shipping_label_url IS NULL)
LIMIT 1;

-- Copiar el order_id (ej: '64202a7c-dc77-4561-a65d-e907f75c781d')
-- Copiar el shipping_shipment_id (ej: '01362d7d-eb4b-4298-9cbf-f8fcacab4314')
```

2. **Enviar request a sync-label (PowerShell)**:
```powershell
# Reemplazar estos valores:
$orderId = "64202a7c-dc77-4561-a65d-e907f75c781d"  # El order_id de la orden
$syncLabelUrl = "http://localhost:3000/api/admin/shipping/skydropx/sync-label"

# Body del request
$body = @{
    orderId = $orderId
} | ConvertTo-Json

# Enviar request (requiere autenticación admin - usar cookies o token)
$response = Invoke-RestMethod -Uri $syncLabelUrl -Method Post -Headers @{
    "Content-Type" = "application/json"
    # Nota: En producción, necesitarás agregar cookies de sesión o token de autenticación
} -Body $body

# Verificar respuesta
Write-Host "Respuesta del sync-label:"
$response | ConvertTo-Json -Depth 5
```

**NOTA**: En desarrollo, si usas el botón "Actualizar tracking" en la UI de admin, el request se hace automáticamente con las cookies de sesión.

3. **Verificar que se actualizó la orden**:
```sql
-- Verificar que shipping_tracking_number y shipping_label_url se actualizaron
SELECT id, shipping_shipment_id, shipping_tracking_number, shipping_label_url, shipping_status, updated_at
FROM orders
WHERE id = '64202a7c-dc77-4561-a65d-e907f75c781d';
```

4. **Verificar que se insertó el evento**:
```sql
-- Ver el evento insertado en shipping_events
SELECT id, order_id, provider, provider_event_id, raw_status, mapped_status, tracking_number, label_url, occurred_at
FROM shipping_events
WHERE order_id = '64202a7c-dc77-4561-a65d-e907f75c781d'
  AND provider_event_id LIKE 'sync-%'
ORDER BY occurred_at DESC
LIMIT 5;
```

**Validaciones esperadas**:
- ✅ Respuesta 200 con `{ok: true, updated: true, message: "...", trackingNumber?: string, labelUrl?: string}`
- ✅ La orden tiene `shipping_tracking_number` actualizado (si Skydropx lo tiene disponible)
- ✅ La orden tiene `shipping_label_url` actualizado (si Skydropx lo tiene disponible)
- ✅ Se inserta un nuevo registro en `shipping_events` con `provider_event_id` que empieza con `sync-`
- ✅ Logs en consola muestran "Datos extraídos de Skydropx" con `packagesCount`, `foundTracking`, `foundLabel`, `strategyUsed`

**Troubleshooting**:
- Si responde `{ok: false, code: "missing_shipment_id"}`: Verificar que la orden tenga `shipping_shipment_id` guardado
- Si responde `{ok: false, code: "skydropx_not_found"}`: Verificar que el `shipment_id` existe en Skydropx
- Si responde `{ok: true, updated: false}`: Los datos ya están actualizados, no hay cambios nuevos
- Si no se inserta evento: Verificar logs en consola para errores de inserción

#### 3. Caso: Webhook actualiza timeline del cliente

**Pasos**:
1. Tener una orden con `shipping_shipment_id` guardado
2. Enviar webhook de prueba con diferentes estados:
   - `status: "created"` → `shipping_status` debe ser `"label_created"`
   - `status: "in_transit"` → `shipping_status` debe ser `"in_transit"`
   - `status: "delivered"` → `shipping_status` debe ser `"delivered"`
3. Verificar que:
   - El evento se guarda en `shipping_events` (idempotente)
   - La orden se actualiza con el nuevo estado
   - En `/cuenta/pedidos/<id>`, el timeline muestra el nuevo evento

**Validación**:
```sql
-- Ver eventos guardados
SELECT id, order_id, provider, raw_status, mapped_status, tracking_number, occurred_at
FROM shipping_events
WHERE order_id = '<order_id>'
ORDER BY occurred_at DESC;

-- Verificar que el evento es idempotente (enviar mismo webhook 2 veces, solo debe haber 1 registro)
```

#### 4. Test Manual: Webhook con shipping_shipment_id específico

**Objetivo**: Verificar que el webhook puede hacer matching por `orders.shipping_shipment_id`.

**Pre-requisitos**:
1. Ejecutar SQL de `shipping_events` si no se ha ejecutado
2. Tener una orden con `shipping_shipment_id` guardado (ej: después de `create-label`)

**Pasos**:

1. **Verificar orden en Supabase**:
```sql
-- En Supabase SQL Editor, buscar orden con shipping_shipment_id
SELECT id, shipping_shipment_id, shipping_provider, shipping_tracking_number, shipping_label_url
FROM orders
WHERE shipping_shipment_id IS NOT NULL
LIMIT 1;

-- Copiar el shipping_shipment_id (ej: '59ca104a-3f52-4728-b8a7-1d3510045fa1')
```

2. **Enviar webhook con curl (PowerShell)**:
```powershell
# Reemplazar estos valores:
$webhookSecret = "tu_secret_aqui"  # SKYDROPX_WEBHOOK_SECRET
$webhookUrl = "http://localhost:3000/api/shipping/skydropx/webhook"
$shipmentId = "59ca104a-3f52-4728-b8a7-1d3510045fa1"  # El shipping_shipment_id de la orden
$orderId = "uuid_de_orden_en_supabase"  # Solo para referencia, no se usa en matching

# Payload de ejemplo (formato JSON:API de Skydropx)
$body = @{
    data = @{
        id = "event_test_$(Get-Date -Format 'yyyyMMddHHmmss')"
        type = "shipment_event"
        attributes = @{
            status = "created"
            tracking_number = "TEST_TRACK_$(Get-Date -Format 'HHmmss')"
            label_url = "https://example.com/label-test.pdf"
            updated_at = (Get-Date -Format "o")
        }
        relationships = @{
            shipment = @{
                data = @{
                    id = $shipmentId
                    type = "shipment"
                }
            }
        }
    }
} | ConvertTo-Json -Depth 10

# Enviar webhook
$response = Invoke-RestMethod -Uri $webhookUrl -Method Post -Headers @{
    "x-skydropx-secret" = $webhookSecret
    "Content-Type" = "application/json"
} -Body $body

# Verificar respuesta (debe ser 200 con {received: true, message: "ok"})
Write-Host "Respuesta del webhook:"
$response | ConvertTo-Json
```

3. **Verificar que se insertó el evento**:
```sql
-- Ver el evento insertado
SELECT id, order_id, provider, raw_status, mapped_status, tracking_number, occurred_at
FROM shipping_events
WHERE order_id = '<order_id>'  -- Usar el order_id de la orden
ORDER BY occurred_at DESC
LIMIT 5;
```

4. **Verificar que se actualizó la orden**:
```sql
-- Verificar que shipping_tracking_number y shipping_label_url se actualizaron
SELECT id, shipping_shipment_id, shipping_tracking_number, shipping_label_url, shipping_status
FROM orders
WHERE id = '<order_id>';
```

**Validaciones esperadas**:
- ✅ Respuesta 200 con `{received: true, message: "ok"}`
- ✅ Se inserta un nuevo registro en `shipping_events`
- ✅ Se actualiza `orders.shipping_tracking_number` con el tracking_number del webhook
- ✅ Se actualiza `orders.shipping_label_url` con el label_url del webhook
- ✅ Logs en consola muestran "Orden encontrada por shipping_shipment_id (columna)"

**Troubleshooting**:
- Si responde "No matching order": Revisar logs en consola para ver qué `shipmentId` se extrajo y qué estrategias de matching se intentaron
- Si no se actualiza: Verificar que el `mappedStatus` sea válido (ej: "created" -> "label_created")
- Si hay error 401: Verificar que `SKYDROPX_WEBHOOK_SECRET` coincida con el header `x-skydropx-secret`

#### 5. Validación de Guardrails

**Admin UI**:
- ✅ Si `payment_status !== "paid"`: Botón "Crear guía" debe estar deshabilitado con callout claro
- ✅ Si hay evidencia de guía (`hasShipmentId || tracking || label_url`): Inputs manuales ocultos, solo override de emergencia (colapsado)
- ✅ Si `label_url` existe: Botón "Descargar etiqueta (PDF)" visible y funcional
- ✅ Tracking automático se muestra en sección dedicada cuando hay evidencia

**Webhook**:
- ✅ Validación de secret: Webhook sin `x-skydropx-secret` o secret incorrecto → 401
- ✅ Matching por `shipping_shipment_id` (prioridad) → `tracking_number` (fallback)
- ✅ Idempotencia: Mismo `provider_event_id` enviado 2 veces → Solo 1 registro en `shipping_events`
- ✅ No sobreescribe valores existentes con null
- ✅ Siempre responde 200 (incluso si no encuentra orden) para evitar reenvíos

**Sync-label**:
- ✅ Si no hay `shipment_id`: Devuelve `missing_shipment_id` con mensaje claro
- ✅ Si hay `shipment_id`: Hace GET a Skydropx y actualiza solo si hay nuevos valores
- ✅ No sobreescribe valores existentes con null
- ✅ Devuelve `updated: true/false` según si hubo cambios

### Troubleshooting

**Problema**: Webhook responde 401 "Unauthorized"
- **Solución**: Verificar que `SKYDROPX_WEBHOOK_SECRET` en `.env.local` coincida con el configurado en Skydropx dashboard

**Problema**: Webhook responde 200 pero no actualiza la orden
- **Solución**: Verificar que la orden tenga `shipping_shipment_id` guardado (ejecutar SQL de backfill si es necesario)

**Problema**: Eventos duplicados en `shipping_events`
- **Solución**: Verificar que el índice único `idx_shipping_events_provider_event_id` existe. Si no, ejecutar SQL de creación de tabla.

**Problema**: Tracking no aparece después de create-label
- **Solución**: Normal, Skydropx genera tracking asíncronamente. Usar botón "Actualizar tracking" (sync-label) o esperar webhook automático.

**Problema**: Timeline cliente no muestra eventos
- **Solución**: Verificar que la orden tenga `shipping_provider = "skydropx"` y que existan registros en `shipping_events` para esa orden.

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🗄️ Base de Datos (Supabase)

### Paso 1: Ejecutar setup SQL

1. Ve a tu proyecto en Supabase
2. Abre "SQL Editor"
3. Ejecuta el archivo `supabase-setup.sql`
4. Ejecuta el archivo `supabase-functions.sql`

### Paso 1.5: Ejecutar migraciones de shipping events (requerido para webhooks)

**IMPORTANTE**: Para que el webhook de Skydropx pueda hacer matching correcto de órdenes por `shipment_id` y guardar eventos de tracking, debes ejecutar el siguiente SQL:

1. Ve a "SQL Editor" en Supabase
2. Ejecuta el archivo `ops/sql/2025-01-15_add_shipping_events_and_shipment_id.sql`

Este script:
- Agrega la columna `shipping_shipment_id` a `public.orders` (si no existe)
- Hace backfill de `shipping_shipment_id` desde `metadata.shipping.shipment_id` para órdenes existentes
- Crea la tabla `public.shipping_events` para guardar eventos de tracking
- Crea índices necesarios para optimización

**Nota**: Sin ejecutar este SQL, el webhook de Skydropx no podrá hacer matching por `shipment_id` y los eventos de tracking no se guardarán.

### Paso 2: Configurar Storage

1. Ve a "Storage" en Supabase
2. Crea un bucket llamado `avatars`
3. Marca como público

### Paso 3: Configurar Auth

1. Ve a "Authentication" → "Providers"
2. Habilita "Email"
3. En "URL Configuration":
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/**`

## 💳 Stripe

### Modo de prueba

1. Activa el modo de prueba en Stripe Dashboard
2. Copia las API keys de prueba
3. Para webhooks locales, usa Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

4. Copia el webhook secret que aparece y úsalo en `.env.local`

### Tarjetas de prueba

- **Éxito**: `4242 4242 4242 4242`
- **Rechazo**: `4000 0000 0000 0002`
- Fecha: cualquier fecha futura
- CVC: cualquier 3 dígitos

## 🚀 Ejecutar el proyecto

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 🧪 Flujo de prueba

1. **Registro**:
   - Ve a `/cuenta`
   - Crea una cuenta nueva
   - Confirma el email (revisa tu bandeja)

2. **Carrito**:
   - Ve a `/destacados`
   - Agrega productos al carrito
   - Ve a `/carrito`

3. **Checkout**:
   - Click en "Continuar al Checkout"
   - Elige método de entrega
   - Agrega una dirección (si es entrega) o elige punto de recogida
   - Ingresa datos de contacto
   - Canjea puntos si tienes (después de tu primera compra)
   - Click en "Ir a Pagar"
   - Usa la tarjeta de prueba `4242 4242 4242 4242`

4. **Verificar**:
   - Deberías ver la página de confirmación
   - Ve a `/cuenta/pedidos` para ver tu pedido
   - Ve a `/cuenta/puntos` para ver tus puntos ganados

## 📁 Datos de prueba

El proyecto incluye un archivo CSV de productos destacados en:

```
public/data/destacados_sin_descuento.csv
```

Formato del CSV:

```csv
sku,nombre,precio,descripcion
SKU001,Producto 1,150.00,Descripción del producto
```

## 🔧 Personalización

### Cambiar colores

Edita `tailwind.config.ts`:

```typescript
colors: {
  primary: {
    50: '#f0f9ff',
    // ... tus colores
  },
}
```

### Cambiar puntos de recogida

Edita `src/app/checkout/datos/page.tsx`:

```typescript
const PICKUP_LOCATIONS = [
  { id: "1", name: "Sucursal Centro", address: "..." },
  // Agrega más ubicaciones
];
```

### Cambiar reglas de envío

Edita `src/lib/utils/currency.ts`:

```typescript
export function calculateShipping(subtotal: number): number {
  return subtotal >= 2000 ? 0 : 150;
}
```

### Cambiar reglas de puntos

Edita `src/lib/utils/currency.ts`:

```typescript
export function calculatePointsEarned(total: number): number {
  return Math.floor(total / 10); // 1 punto por cada $10
}

export function calculatePointsValue(points: number): number {
  return (points / 100) * 10; // 100 puntos = $10
}
```

### WhatsApp

Edita `src/components/WhatsappFloating.tsx`:

```typescript
const phoneNumber = "525512345678"; // Tu número con código de país
```

## 📦 Perfiles de empaque y dimensiones de envío (Admin)

### Seleccionar empaque en pedidos

Para obtener cotizaciones precisas de Skydropx, es importante seleccionar el empaque correcto antes de recotizar o crear guías:

1. Ve a Admin → Pedidos → [Orden con Skydropx]
2. Busca la sección "Empaque de envío"
3. Selecciona un perfil predefinido:
   - **Sobre (ENVELOPE)**: 32×23×1 cm, 50g base - Para documentos/productos planos
   - **Caja Pequeña (BOX_S)**: 25×20×15 cm, 150g base - Para productos pequeños
   - **Caja Mediana (BOX_M)**: 35×30×25 cm, 300g base - Para productos medianos
4. O elige "Personalizado" e ingresa dimensiones y peso manualmente
5. Click "Guardar empaque"

**Notas importantes:**
- El empaque guardado se usa automáticamente en `/requote` y `/create-label`
- Si no hay empaque guardado, el sistema usa BOX_S por defecto y muestra un warning
- No se puede cambiar el empaque si ya se creó la guía (tiene `shipping_tracking_number` o `shipping_label_url`)
- **Peso mínimo**: Skydropx requiere/cobra mínimo 1kg (1000g) para cotizaciones y envíos. Si el paquete pesa menos de 1kg, se ajustará automáticamente a 1kg (ver `SKYDROPX_MIN_BILLABLE_WEIGHT_G`)

**Estructura de `metadata.shipping_package`:**
```typescript
{
  mode: "profile" | "custom",
  profile: "ENVELOPE" | "BOX_S" | "BOX_M" | null,
  length_cm: number,
  width_cm: number,
  height_cm: number,
  weight_g: number
}
```

### Dimensiones de productos

Para ayudar con la estimación de empaques, puedes guardar peso y dimensiones por producto:

1. Ve a Admin → Productos → [Producto] → Editar
2. Busca la sección "Dimensiones de envío"
3. Completa:
   - **Peso (g)**: Peso del producto en gramos
   - **Largo/Ancho/Alto (cm)**: Dimensiones del producto
   - **Perfil recomendado**: Sugerencia de perfil (ENVELOPE/BOX_S/BOX_M/CUSTOM)
4. Click "Guardar dimensiones"

**Columnas agregadas a `products`:**
- `shipping_weight_g`: Peso en gramos (INTEGER, nullable)
- `shipping_length_cm`: Largo en centímetros (INTEGER, nullable)
- `shipping_width_cm`: Ancho en centímetros (INTEGER, nullable)
- `shipping_height_cm`: Alto en centímetros (INTEGER, nullable)
- `shipping_profile`: Perfil recomendado (TEXT, nullable: "ENVELOPE", "BOX_S", "BOX_M", "CUSTOM")

**Migración SQL:**
Ejecuta `ops/sql/2025-01-XX_add_shipping_fields_to_products.sql` en Supabase SQL Editor.

### Flujo recomendado

1. **Configurar productos**: Editar dimensiones de productos individuales (opcional pero recomendado)
2. **Crear pedido**: El cliente realiza su pedido normalmente
   - El sistema calcula peso estimado automáticamente (suma de productos con fallback)
   - El peso estimado se usa para cotizar tarifas en checkout
3. **Seleccionar empaque (opcional)**: En Admin → Pedidos → [Orden], seleccionar empaque estimado para recotizar
4. **Recotizar**: Click "Recotizar envío" para obtener tarifas actualizadas (usa empaque seleccionado o peso estimado)
5. **Aplicar tarifa**: Seleccionar y aplicar la mejor tarifa
6. **Capturar paquete real**: En Admin → Pedidos → [Orden], sección "Paquete real para guía":
   - Armar la caja real con los productos
   - Capturar peso y dimensiones reales
   - Click "Guardar paquete"
7. **Crear guía**: Click "Crear guía en Skydropx" (usa el paquete real capturado, NO el estimado)

## 🔄 Recotización de envíos Skydropx (Admin)

Si una tarifa de Skydropx expira (+24 horas desde `quoted_at`), puedes recotizar desde Admin sin cancelar la orden:

1. Ve a Admin → Pedidos → [Orden]
2. Selecciona el empaque (si no está guardado)
3. Click en "Recotizar envío (Skydropx)"
4. Se mostrarán las tarifas disponibles actualizadas
5. Selecciona una tarifa y click en "Aplicar esta tarifa"

**Notas importantes:**
- La recotización solo está disponible para órdenes con `shipping_provider = "skydropx"` y que NO sean pickup
- Si ya se creó la guía (tiene `shipping_tracking_number` o `shipping_label_url`), no se puede recotizar. Primero cancela la guía existente
- El sistema guarda `metadata.shipping.quoted_at` con la fecha/hora de la cotización (ISO string)
- Si el precio de la nueva tarifa es mayor, se mostrará un badge "+ $X" para que el admin decida si absorber la diferencia o contactar al cliente
- La tarifa expira después de 24 horas. El sistema muestra un warning si está próxima a expirar (20-24h) o ya expirada

**Campos guardados en metadata.shipping:**
- `quoted_at`: Fecha/hora de la cotización (ISO string)
- `rate.external_id`: ID de la tarifa en Skydropx
- `rate.provider`: Proveedor (ej: "estafeta", "dhl")
- `rate.service`: Nombre del servicio
- `rate.eta_min_days` / `rate.eta_max_days`: Tiempo estimado de entrega
- `price_cents`: Precio de la tarifa en centavos

## ❓ Solución de problemas

### "No autenticado"

- Verifica que las variables de Supabase en `.env.local` sean correctas
- Asegúrate de haber ejecutado los scripts SQL
- Revisa que el bucket `avatars` exista

### Webhook no funciona

- Asegúrate de tener Stripe CLI corriendo
- Verifica que el webhook secret en `.env.local` coincida con el de Stripe CLI
- Revisa los logs de la terminal

### Carrito no guarda

- Verifica que las políticas RLS estén creadas (script SQL)
- Revisa la consola del navegador para errores

### Error al pagar

- Verifica que las keys de Stripe sean correctas
- Usa tarjetas de prueba válidas
- Revisa los logs en la terminal de Next.js

## 📚 Documentación adicional

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🆘 Ayuda

Si necesitas ayuda, revisa:

1. Los logs en la terminal de Next.js
2. La consola del navegador (F12)
3. Los eventos en Stripe Dashboard
4. Los logs en Supabase Dashboard

¡Listo para desarrollar! 🎉
