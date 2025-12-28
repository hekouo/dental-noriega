# 🔄 Guía de Cambio de Dominio

Esta guía permite cambiar el dominio del sitio de forma sencilla, sin necesidad de modificar código. Solo se requiere actualizar variables de entorno y configuración en servicios externos.

## ⚙️ Configuración Centralizada

El sitio usa una constante centralizada en `src/lib/site.ts`:

```typescript
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
```

**Importante**: Para cambiar de dominio, solo necesitas actualizar `NEXT_PUBLIC_SITE_URL` en Vercel. Todo el código usa esta constante.

## 📋 Checklist de Cambio de Dominio

### 1. Vercel (Hosting)

- [ ] **Agregar dominio en Vercel Dashboard**
  1. Ve a **Settings → Domains**
  2. Agrega el nuevo dominio (ej: `ddnshop.mx`)
  3. Agrega también `www.ddnshop.mx` (opcional, se puede redirigir)
  4. Configura DNS según instrucciones de Vercel:
     - **A Record** o **CNAME** según lo indique Vercel

- [ ] **Marcar como dominio primario**
  1. En **Settings → Domains**, selecciona el nuevo dominio
  2. Haz clic en **"Set as Primary Domain"**
  3. Esto asegura que todas las URLs canónicas usen este dominio

- [ ] **Configurar redirección (si aplica)**
  1. Si quieres redirigir `www` a dominio raíz:
     - En **Settings → Domains → Redirects**
     - Agrega: `www.ddnshop.mx` → `ddnshop.mx` (301)

### 2. Variable de Entorno en Vercel

- [ ] **Actualizar `NEXT_PUBLIC_SITE_URL`**
  1. Ve a **Settings → Environment Variables**
  2. Busca `NEXT_PUBLIC_SITE_URL`
  3. Actualiza el valor a: `https://ddnshop.mx` (o tu nuevo dominio)
  4. **IMPORTANTE**: Marca para **Production**, **Preview** y **Development**
  5. Guarda cambios

- [ ] **Redeploy**
  1. Ve a **Deployments**
  2. Haz clic en **"..."** del último deployment
  3. Selecciona **"Redeploy"**
  4. O ejecuta desde CLI: `vercel --prod`

### 3. Supabase (Autenticación)

- [ ] **Actualizar Site URL**
  1. Ve a tu proyecto en Supabase Dashboard
  2. Ve a **Authentication → URL Configuration**
  3. Actualiza **Site URL** a: `https://ddnshop.mx`

- [ ] **Actualizar Redirect URLs**
  1. En la misma sección, ve a **Redirect URLs**
  2. Agrega las siguientes URLs (si no existen):
     - `https://ddnshop.mx/auth/callback`
     - `https://ddnshop.mx/cuenta/perfil`
     - `https://ddnshop.mx/update-password`
     - `https://ddnshop.mx/forgot-password`
  3. **IMPORTANTE**: Mantén las URLs del dominio anterior durante la transición (por si hay links pendientes)

- [ ] **Actualizar SMTP (si usas Resend)**
  1. Ve a **Authentication → SMTP Settings** (si aplica)
  2. Verifica que el dominio de envío sea el nuevo dominio
  3. Si usas Resend, ve al paso 4

### 4. Resend (Emails - si aplica)

- [ ] **Agregar dominio en Resend**
  1. Ve a [resend.com/domains](https://resend.com/domains)
  2. Haz clic en **"Add Domain"**
  3. Ingresa el nuevo dominio: `ddnshop.mx`
  4. Configura DNS según instrucciones:
     - **DKIM**: Agrega el registro TXT proporcionado
     - **SPF**: `v=spf1 include:resend.com ~all`
     - **DMARC** (opcional): `v=DMARC1; p=none; rua=mailto:postmaster@ddnshop.mx`

- [ ] **Verificar dominio**
  1. Espera a que Resend verifique los registros DNS (puede tardar horas)
  2. Verifica en el dashboard que el dominio esté "Verified"

- [ ] **Actualizar SMTP en Supabase**
  1. En Supabase, ve a **Authentication → SMTP Settings**
  2. Si usas Resend, actualiza:
     - **SMTP Host**: `smtp.resend.com`
     - **SMTP Port**: `465` o `587`
     - **Sender email**: `noreply@ddnshop.mx` (o el email configurado en Resend)

### 5. Stripe (Pagos)

- [ ] **Actualizar Webhook URL**
  1. Ve a [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
  2. Selecciona el webhook existente (o créalo si no existe)
  3. Actualiza la **Endpoint URL** a: `https://ddnshop.mx/api/stripe/webhook`
  4. Verifica que los eventos seleccionados estén correctos:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `checkout.session.completed`
  5. Guarda cambios

- [ ] **Actualizar Return URLs (si aplica)**
  1. En Stripe Dashboard, ve a **Settings → Branding**
  2. Verifica que las URLs de retorno usen el nuevo dominio
  3. No suele ser necesario si usas URLs relativas en el código (ya están usando SITE_URL)

### 6. Google Search Console / Analytics (Opcional pero recomendado)

- [ ] **Agregar propiedad nueva**
  1. Ve a [search.google.com/search-console](https://search.google.com/search-console)
  2. Haz clic en **"Add Property"**
  3. Ingresa el nuevo dominio: `ddnshop.mx`
  4. Verifica propiedad (DNS, HTML tag, etc.)

- [ ] **Enviar nuevo sitemap**
  1. En la nueva propiedad, ve a **Sitemaps**
  2. Envía: `https://ddnshop.mx/sitemap.xml`

- [ ] **Actualizar Google Analytics (si aplica)**
  1. Ve a tu propiedad en Google Analytics
  2. Actualiza **Default URL** a: `https://ddnshop.mx`
  3. Si usas GA4, verifica que la URL base sea correcta

### 7. Verificación y QA

Después de actualizar todo, realiza las siguientes pruebas:

#### 7.1 Autenticación
- [ ] **Registro nuevo usuario**
  1. Ve a `/cuenta`
  2. Crea una cuenta nueva
  3. Verifica que el email de confirmación llegue correctamente
  4. Verifica que el link de confirmación use el nuevo dominio

- [ ] **Login con Google (si aplica)**
  1. Ve a `/cuenta`
  2. Haz clic en "Iniciar sesión con Google"
  3. Verifica que después del login redirija correctamente
  4. Verifica que la URL de retorno use el nuevo dominio

- [ ] **Reset de contraseña**
  1. Ve a `/forgot-password`
  2. Ingresa un email válido
  3. Verifica que el email llegue
  4. Verifica que el link use el nuevo dominio
  5. Completa el reset de contraseña

#### 7.2 Checkout
- [ ] **Checkout con Stripe**
  1. Agrega productos al carrito
  2. Completa el checkout hasta el pago
  3. Realiza un pago de prueba con tarjeta: `4242 4242 4242 4242`
  4. Verifica que después del pago redirija a `/checkout/gracias`
  5. Verifica que la URL de retorno use el nuevo dominio

- [ ] **Checkout con transferencia bancaria**
  1. Completa checkout hasta el paso de pago
  2. Selecciona "Transferencia bancaria"
  3. Completa la orden
  4. Verifica que funcione correctamente

#### 7.3 SEO y Metadata
- [ ] **Verificar robots.txt**
  1. Visita: `https://ddnshop.mx/robots.txt`
  2. Verifica que el sitemap apunte al nuevo dominio: `Sitemap: https://ddnshop.mx/sitemap.xml`

- [ ] **Verificar sitemap.xml**
  1. Visita: `https://ddnshop.mx/sitemap.xml`
  2. Verifica que todas las URLs usen el nuevo dominio
  3. Verifica que el sitemap se genere correctamente

- [ ] **Verificar Open Graph / Twitter Cards**
  1. Usa [opengraph.xyz](https://www.opengraph.xyz/) o similar
  2. Ingresa: `https://ddnshop.mx`
  3. Verifica que las imágenes y metadata se muestren correctamente

#### 7.4 Admin (si aplica)
- [ ] **Login de admin**
  1. Ve a `/admin`
  2. Verifica que el login funcione
  3. Verifica que las rutas protegidas funcionen

### 8. Limpieza (Después de confirmar que todo funciona)

- [ ] **Remover dominio antiguo de Vercel (opcional)**
  1. Si ya no necesitas el dominio antiguo, puedes removerlo
  2. **IMPORTANTE**: Espera al menos 1-2 semanas para asegurar que no hay links pendientes

- [ ] **Remover URLs antiguas de Supabase (opcional)**
  1. Después de confirmar que no hay emails pendientes, puedes remover las Redirect URLs del dominio antiguo
  2. Mantén solo las del nuevo dominio

## 🚨 Troubleshooting

### Problema: Emails no llegan después del cambio

**Solución:**
1. Verifica que Resend tenga el dominio verificado
2. Verifica los registros DNS (DKIM, SPF, DMARC)
3. Revisa los logs en Resend Dashboard
4. Verifica que Supabase tenga la configuración SMTP correcta

### Problema: Stripe webhook no funciona

**Solución:**
1. Verifica que la URL del webhook en Stripe use el nuevo dominio
2. Revisa los logs del webhook en Stripe Dashboard
3. Verifica que el endpoint `/api/stripe/webhook` responda correctamente
4. Prueba enviando un evento de test desde Stripe

### Problema: Redirects infinitos o errores 404

**Solución:**
1. Verifica que `NEXT_PUBLIC_SITE_URL` esté actualizado en Vercel
2. Asegúrate de hacer un redeploy después de cambiar la variable
3. Limpia cache del navegador
4. Verifica que las Redirect URLs en Supabase usen el nuevo dominio

### Problema: Google OAuth no funciona

**Solución:**
1. Verifica que la Redirect URL en Supabase use el nuevo dominio
2. Verifica que Google OAuth Console tenga la URL autorizada
3. Si usas Google Cloud Console, agrega el nuevo dominio a "Authorized redirect URIs"

## 📝 Notas Finales

- **Tiempo estimado**: 1-2 horas (sin incluir verificación DNS que puede tardar hasta 48 horas)
- **Downtime**: Mínimo si se hace correctamente (solo el tiempo de redeploy)
- **Rollback**: Si algo sale mal, puedes revertir `NEXT_PUBLIC_SITE_URL` y redeployar rápidamente

## ✅ Confirmación Final

Antes de considerar el cambio completo:

- [ ] Todos los emails funcionan correctamente
- [ ] Checkout con Stripe funciona
- [ ] Checkout con transferencia funciona
- [ ] Autenticación (registro, login, reset password) funciona
- [ ] Admin funciona (si aplica)
- [ ] robots.txt y sitemap.xml usan el nuevo dominio
- [ ] Open Graph / Twitter Cards funcionan
- [ ] Google Search Console reconoce el nuevo dominio

---

**Última actualización**: 2024
**Mantenedor**: Equipo de desarrollo

