# Integración de Envíos con Skydropx

Esta documentación describe la integración de Skydropx como proveedor de envíos para Depósito Dental Noriega.

## Variables de Entorno

Configura las siguientes variables en tu `.env.local` o en Vercel:

### Autenticación de Skydropx

El cliente usa **OAuth 2.0** exclusivamente.

```env
ENABLE_SKYDROPX_SHIPPING=true
SKYDROPX_CLIENT_ID=tu_client_id
SKYDROPX_CLIENT_SECRET=tu_client_secret
SKYDROPX_BASE_URL=https://api-pro.skydropx.com
SKYDROPX_AUTH_BASE_URL=https://api-pro.skydropx.com
SKYDROPX_OAUTH_TOKEN_URL=https://api-pro.skydropx.com/api/v1/oauth/token
SKYDROPX_QUOTATIONS_BASE_URL=https://api-pro.skydropx.com
```

**Importante:** 
- `SKYDROPX_BASE_URL`: URL base para otros endpoints de API (shipments, etc.). Valor por defecto: `https://api.skydropx.com`.
- `SKYDROPX_AUTH_BASE_URL`: URL base para autenticación OAuth. Valor por defecto: `https://api-pro.skydropx.com`.
- `SKYDROPX_OAUTH_TOKEN_URL`: URL completa del endpoint OAuth. Si no se especifica, se construye como `${SKYDROPX_AUTH_BASE_URL}/oauth/token`.
- `SKYDROPX_QUOTATIONS_BASE_URL`: URL base para cotizaciones. Valor por defecto: `https://app.skydropx.com`. El endpoint final es: `${SKYDROPX_QUOTATIONS_BASE_URL}/api/v1/quotations`.
- El cliente usa `Authorization: Bearer ${accessToken}` para todas las requests a la API.

### Dirección de Origen

```env
SKYDROPX_ORIGIN_NAME=Deposito Dental Noriega
SKYDROPX_ORIGIN_PHONE=+525531033715
SKYDROPX_ORIGIN_EMAIL=dental.noriega721@gmail.com
SKYDROPX_ORIGIN_COUNTRY=MX
SKYDROPX_ORIGIN_STATE=Ciudad de México
SKYDROPX_ORIGIN_CITY=Ciudad de México
SKYDROPX_ORIGIN_POSTAL_CODE=14380
SKYDROPX_ORIGIN_ADDRESS_LINE_1=prolongacion division del norte #2 colonia san bartolo el chico
```

### Feature Flag

```env
ENABLE_SKYDROPX_SHIPPING=true
```

Si se establece en `false`, Skydropx estará deshabilitado y el checkout funcionará sin envío automatizado.

## Endpoints de la API de Skydropx

La integración usa los siguientes endpoints de Skydropx:

### POST `/api/v1/quotations`

Crea una cotización de envío con Skydropx.

**URL completa:** `${SKYDROPX_QUOTATIONS_BASE_URL}/api/v1/quotations` (por defecto: `https://api-pro.skydropx.com/api/v1/quotations`)

**Nota:** Actualmente se usa `api-pro.skydropx.com` tanto para OAuth como para cotizaciones.

**Autenticación:** `Authorization: Bearer <access_token>` (token obtenido vía OAuth)

**Payload de ejemplo (según documentación oficial de Skydropx):**
```json
{
  "quotation": {
    "order_id": "ddn-web-checkout",
    "address_from": {
      "country_code": "MX",
      "postal_code": "14380",
      "area_level1": "Ciudad de México",
      "area_level2": "Tlalpan",
      "area_level3": "San Bartolo El Chico"
    },
    "address_to": {
      "country_code": "MX",
      "postal_code": "14390",
      "area_level1": "Ciudad de México",
      "area_level2": "Tlalpan",
      "area_level3": "Villa Coapa"
    },
    "parcels": [
      {
        "length": 20,
        "width": 20,
        "height": 10,
        "weight": 2,
        "package_protected": false,
        "declared_value": 500
      }
    ]
  }
}
```

**Campos obligatorios:**
- `quotation.order_id`: ID de la orden (string, default: "ddn-web-checkout")
- `quotation.address_from.country_code`: código de país de origen (string, ej: "MX")
- `quotation.address_from.postal_code`: código postal de origen (string)
- `quotation.address_to.country_code`: código de país de destino (string, ej: "MX")
- `quotation.address_to.postal_code`: código postal de destino (string)
- `quotation.parcels`: array de objetos con:
  - `length`, `width`, `height`: dimensiones como enteros (en cm)
  - `weight`: peso como número (en kg)
  - `package_protected`: boolean (default: false)
  - `declared_value`: valor declarado del paquete (número, default: 100)

**Campos opcionales pero recomendados:**
- `quotation.address_from.area_level1` y `quotation.address_to.area_level1`: estado/provincia
- `quotation.address_from.area_level2` y `quotation.address_to.area_level2`: ciudad/municipio
- `quotation.address_from.area_level3` y `quotation.address_to.area_level3`: colonia/barrio

El código mapea automáticamente desde nuestro formato interno:
- `address_from.zip` → `quotation.address_from.postal_code`
- `address_from.country` → `quotation.address_from.country_code`
- `address_from.state` o `address_from.province` → `quotation.address_from.area_level1`
- `address_from.city` → `quotation.address_from.area_level2`
- `address_from.neighborhood` → `quotation.address_from.area_level3` (fallback a city si no existe)

**Manejo de errores:**
- La función `createQuotation` devuelve un resultado controlado (`SkydropxQuotationResult`) en lugar de lanzar excepciones
- **400 Bad Request**: errores genéricos, se devuelve `{ ok: false, code: "invalid_params", message, errors }`
- **422 Unprocessable Entity**: errores de validación con detalles en `errors.address_from`, `errors.address_to`, `errors.parcels`, se devuelve `{ ok: false, code: "invalid_params", message, errors }`
- Si no hay cobertura, se devuelve `{ ok: false, code: "no_coverage", message, errors }`
- En estos casos, `getSkydropxRates` devuelve `[]` sin romper el flujo del checkout
- La API `/api/shipping/rates` devuelve `{ ok: false, reason: "no_rates_from_skydropx", options: [] }`
- El frontend muestra un mensaje amigable: "Lo sentimos, no hay envíos disponibles para esta dirección. Intenta con otro código postal."
- El checkout continúa funcionando con el método manual de envío
- Los errores de autenticación (401, 403) se devuelven con `code: "auth_error"`
- Los errores de red o 5xx se devuelven con `code: "network_error"` o `code: "unknown_error"`

### POST `/v1/shipments`

Crea un envío con Skydropx (URL completa: `${SKYDROPX_BASE_URL}/v1/shipments`)

**Payload de ejemplo:**
```json
{
  "rate_id": "rate_123",
  "address_from": {
    "province": "Ciudad de México",
    "city": "Tlalpan",
    "country": "MX",
    "zip": "14380",
    "name": "Deposito Dental Noriega",
    "phone": "+525531033715",
    "email": "dental.noriega721@gmail.com",
    "address1": "Prolongación División del Norte #2"
  },
  "address_to": {
    "province": "Jalisco",
    "city": "Guadalajara",
    "country": "MX",
    "zip": "44100",
    "name": "Juan Pérez",
    "phone": "+523312345678",
    "email": "juan@example.com",
    "address1": "Av. Revolución 123"
  },
  "parcels": [
    {
      "weight": 1.5,
      "distance_unit": "CM",
      "mass_unit": "KG",
      "height": 20,
      "width": 20,
      "length": 30
    }
  ]
}
```

**Response:**
```json
{
  "id": "shipment_456",
  "master_tracking_number": "EST123456789MX",
  "carrier_name": "estafeta",
  "workflow_status": "pending",
  "payment_status": "paid",
  "included": [
    {
      "id": "package_789",
      "tracking_number": "EST123456789MX",
      "label_url": "https://app.skydropx.com/labels/abc123.pdf"
    }
  ]
}
```

### GET `/v1/quotations/{id}`

Obtiene una cotización específica (URL completa: `${SKYDROPX_BASE_URL}/v1/quotations/{id}`)

## Endpoints Internos

### POST `/api/shipping/quotations`

Crea una cotización de envío con Skydropx (usa internamente `POST /v1/quotations` de Skydropx).

**Request:**
```json
{
  "address_from": {
    "province": "Ciudad de México",
    "city": "Ciudad de México",
    "country": "MX",
    "zip": "14380",
    "name": "Deposito Dental Noriega",
    "phone": "+525531033715",
    "email": "dental.noriega721@gmail.com",
    "address1": "prolongacion division del norte #2"
  },
  "address_to": {
    "province": "Jalisco",
    "city": "Guadalajara",
    "country": "MX",
    "zip": "44100"
  },
  "parcels": [
    {
      "weight": 1.5,
      "distance_unit": "CM",
      "mass_unit": "KG",
      "height": 20,
      "width": 20,
      "length": 30
    }
  ]
}
```

**Response (éxito):**
```json
{
  "ok": true,
  "options": [
    {
      "code": "skydropx_estafeta_0",
      "label": "Terrestre (3-4 días)",
      "priceCents": 15000,
      "provider": "skydropx",
      "etaMinDays": 3,
      "etaMaxDays": 4,
      "externalRateId": "rate_123"
    }
  ]
}
```

**Response (sin cobertura):**
```json
{
  "ok": false,
  "reason": "no_rates_from_skydropx",
  "options": []
}
```

**Mapeo de respuesta de Skydropx a formato interno:**
La respuesta de Skydropx puede venir en diferentes formatos (array directo, `data.data`, `data.included`, etc.). El código normaliza todas las variantes a:
- `provider`: nombre del proveedor (Estafeta, DHL, etc.)
- `service`: nombre del servicio
- `totalPriceCents`: precio en centavos MXN
- `etaMinDays` / `etaMaxDays`: días estimados de entrega
- `externalRateId`: ID de la tarifa en Skydropx (para crear el envío después)

### POST `/api/shipping/create-shipment`

Crea un envío (shipment) en Skydropx a partir de una orden existente. Este endpoint:

1. Valida que la orden tenga `shipping_provider = "skydropx"` y un `shipping_rate_ext_id` válido.
2. Obtiene los datos de dirección del destino desde la orden (metadata o campos directos).
3. Crea el shipment en Skydropx usando el `rate_id` guardado.
4. Actualiza la orden con el tracking number, label URL y status.

**Request:**
```json
{
  "orderId": "uuid-de-la-orden"
}
```

**Opcionalmente, puedes proporcionar los datos de dirección si no están en la orden:**
```json
{
  "orderId": "uuid-de-la-orden",
  "addressTo": {
    "countryCode": "MX",
    "postalCode": "44100",
    "state": "Jalisco",
    "city": "Guadalajara",
    "address1": "Av. Revolución 123",
    "name": "Juan Pérez",
    "phone": "+523312345678",
    "email": "juan@example.com"
  }
}
```

**Precondiciones:**
- La orden debe existir en la base de datos.
- La orden debe tener `shipping_provider = "skydropx"`.
- La orden debe tener `shipping_rate_ext_id` no nulo (ID del rate de Skydropx).
- Los datos de dirección del destino deben estar disponibles (en metadata de la orden o proporcionados en el request).

**Response (éxito):**
```json
{
  "ok": true,
  "orderId": "uuid-de-la-orden",
  "trackingNumber": "EST123456789MX",
  "labelUrl": "https://app.skydropx.com/labels/abc123.pdf"
}
```

**Response (error):**
```json
{
  "ok": false,
  "reason": "order_not_found" | "unsupported_provider" | "missing_shipping_rate" | "missing_address_data" | "skydropx_error" | "unknown_error",
  "message": "Descripción del error"
}
```

**Efectos:**
- Crea el shipment en Skydropx.
- Actualiza la orden en Supabase con:
  - `shipping_tracking_number`: número de guía de rastreo.
  - `shipping_label_url`: URL del PDF de la etiqueta (si está disponible).
  - `shipping_status`: se establece en `"created"`.

**Ejemplo de uso:**
```bash
curl -X POST https://tu-dominio.com/api/shipping/create-shipment \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123e4567-e89b-12d3-a456-426614174000"}'
```

**Notas:**
- Si los datos de dirección no están en la orden, el endpoint intentará extraerlos de `metadata.address` o `metadata.shipping.address`.
- Si tampoco están ahí, intentará parsear `pickup_location` (formato: "dirección, colonia, estado CP").
- Si ninguna de estas fuentes tiene los datos, devolverá `missing_address_data` y deberás proporcionarlos en el request.

**Ejemplo de respuesta real de Skydropx (formato JSON:API):**
```json
{
  "data": [
    {
      "id": "rate_123",
      "provider_name": "estafeta",
      "provider_display_name": "Estafeta",
      "provider_service_name": "Terrestre",
      "days": 3,
      "total": 150.00,
      "currency_code": "MXN",
      "pickup": false,
      "pickup_automatic": false
    }
  ]
}
```

**Response (error):**
```json
{
  "ok": false,
  "error": "Mensaje de error"
}
```

### POST `/api/shipping/create-shipment`

Crea un envío/guía en Skydropx a partir de una tarifa seleccionada.

**Request:**
```json
{
  "rate_id": "rate_123",
  "address_from": { ... },
  "address_to": { ... },
  "parcels": [ ... ],
  "products": [
    {
      "name": "Producto 1",
      "sku": "SKU001",
      "price": 500.00,
      "quantity": 2
    }
  ]
}
```

**Response (éxito):**
```json
{
  "ok": true,
  "shipment": {
    "shipment_id": "ship_456",
    "carrier_name": "Estafeta",
    "workflow_status": "pending",
    "payment_status": "pending",
    "total": 150.00,
    "master_tracking_number": "EST123456789",
    "packages": [
      {
        "id": "pkg_789",
        "tracking_number": "EST123456789",
        "label_url": "https://..."
      }
    ]
  }
}
```

## Flujo de Integración

### 1. Cotización en Checkout (`/checkout/datos`)

Cuando el usuario completa su dirección (CP, estado, ciudad):

1. El frontend calcula el peso total del carrito (1kg por producto por defecto).
2. Hace un POST a `/api/shipping/rates` con la dirección de destino.
3. El endpoint llama a `getSkydropxRates()` que usa el cliente OAuth.
4. Se muestran las opciones de envío al usuario.
5. El usuario selecciona una opción (automáticamente se selecciona la más barata).
6. La opción seleccionada se guarda en `checkoutStore.selectedShippingOption`.

### 2. Guardado en Orden

Cuando se crea la orden en `/api/checkout/save-order`:

1. El `selectedShippingOption` se incluye en `metadata.shipping`:
   ```json
   {
     "shipping": {
       "provider": "skydropx",
       "option_code": "skydropx_estafeta_0",
       "rate": {
         "external_id": "rate_123",
         "provider": "estafeta",
         "service": "Terrestre"
       }
     }
   }
   ```

### 3. Creación de Envío (Webhook de Stripe)

Cuando el pago se confirma (`payment_intent.succeeded`):

1. El webhook lee `metadata.shipping` de la orden.
2. Si hay `rate.external_id` y dirección completa, llama a `createSkydropxShipment()`.
3. Si el envío se crea exitosamente, actualiza `metadata.shipping` con:
   ```json
   {
     "shipping": {
       ...datos_existentes,
       "shipment": {
         "id": "ship_456",
         "tracking_number": "EST123456789",
         "label_url": "https://...",
         "carrier_name": "Estafeta",
         "workflow_status": "pending",
         "payment_status": "pending",
         "total": 150.00,
         "packages": [...]
       },
       "integration_status": "success"
     }
   }
   ```
4. Si falla, guarda `integration_status: "error"` y `integration_error` sin romper el flujo.

## Cliente OAuth

El módulo `src/lib/skydropx/client.ts` maneja:

- **Autenticación OAuth**: Obtiene tokens con `grant_type=client_credentials`.
- **Caché de tokens**: Guarda tokens en memoria con expiración para evitar requests innecesarios.
- **Refresh automático**: Si un token expira (401), obtiene uno nuevo y reintenta.

### Funciones principales

- `skydropxFetch(path, options)`: Función genérica para hacer requests autenticados.
- `createQuotation(payload)`: Crea una cotización.
- `createShipment(payload)`: Crea un envío.

## Manejo de Errores

La integración es **tolerante a errores**:

- Si Skydropx falla al cotizar, el checkout muestra un mensaje pero permite continuar.
- Si falla al crear el envío, la orden se marca como pagada pero se guarda el error en metadata.
- El feature flag `ENABLE_SKYDROPX_SHIPPING` permite deshabilitar completamente la integración.

## Compatibilidad hacia Atrás

Las órdenes antiguas sin `metadata.shipping` siguen funcionando correctamente. El código verifica la existencia de estos campos antes de usarlos.

## Próximos Pasos (Opcionales)

Endpoints preparados pero no implementados aún:

- `GET /v1/shipments/{id}`: Obtener detalles de un envío (URL completa: `https://api.skydropx.com/v1/shipments/{id}`).
- `GET /v1/shipments`: Listar envíos (URL completa: `https://api.skydropx.com/v1/shipments`).
- `GET /v1/shipments/tracking`: Rastrear un envío (URL completa: `https://api.skydropx.com/v1/shipments/tracking`).
- `POST /v1/shipments/{shipment_id}/cancellations`: Cancelar un envío (URL completa: `https://api.skydropx.com/v1/shipments/{shipment_id}/cancellations`).

**Nota:** Todos los endpoints usan `/v1/` (no `/api/v1/`) porque `SKYDROPX_BASE_URL` ya apunta a `https://api.skydropx.com`.

Estos pueden implementarse cuando se necesiten.

