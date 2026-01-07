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
