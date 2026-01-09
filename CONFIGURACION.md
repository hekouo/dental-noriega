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

# Peso mínimo billable para Skydropx (default: 1000g = 1kg)
# Skydropx requiere/cobra mínimo 1kg para cotizaciones y envíos.
# Si el paquete pesa menos de 1kg, se ajustará automáticamente a 1kg para la cotización/creación de guía.
SKYDROPX_MIN_BILLABLE_WEIGHT_G=1000

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🗄️ Base de Datos (Supabase)

### Paso 1: Ejecutar setup SQL

1. Ve a tu proyecto en Supabase
2. Abre "SQL Editor"
3. Ejecuta el archivo `supabase-setup.sql`
4. Ejecuta el archivo `supabase-functions.sql`

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
3. **Seleccionar empaque**: En Admin → Pedidos → [Orden], seleccionar empaque apropiado
4. **Recotizar**: Click "Recotizar envío" para obtener tarifas actualizadas usando el empaque seleccionado
5. **Aplicar tarifa**: Seleccionar y aplicar la mejor tarifa
6. **Crear guía**: Click "Crear guía en Skydropx" usando el mismo empaque

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
