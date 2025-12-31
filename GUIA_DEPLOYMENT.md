# Guía de Deployment - Depósito Dental

Esta guía te ayudará a desplegar el proyecto en producción paso a paso.

## ✅ Pre-requisitos

- [ ] Cuenta de Supabase creada
- [ ] Cuenta de Stripe creada
- [ ] Cuenta de Vercel (recomendado) o servidor con Node.js 18+
- [ ] Dominio configurado (opcional pero recomendado)

## 🗄️ Paso 1: Configurar Supabase

### 1.1 Crear proyecto

1. Ve a [supabase.com](https://supabase.com)
2. Click en "New project"
3. Elige un nombre y región
4. Guarda la contraseña de la base de datos

### 1.2 Ejecutar scripts SQL

1. Ve a "SQL Editor" en el panel de Supabase
2. Crea una nueva query
3. Copia y pega el contenido de `supabase-setup.sql`
4. Ejecuta (Run)
5. Repite con `supabase-functions.sql`

### 1.3 Configurar Storage

1. Ve a "Storage" en el panel
2. Click en "Create bucket"
3. Nombre: `avatars`
4. Marca como "Public bucket"
5. Click en "Create bucket"

### 1.4 Obtener credenciales

1. Ve a "Project Settings" → "API"
2. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ NUNCA expongas esta clave)

### 1.5 Configurar autenticación

1. Ve a "Authentication" → "Providers"
2. Asegúrate de que "Email" esté habilitado
3. Configura "Email Templates" si deseas personalizar los correos
   - **Reset Password**: Personaliza el template para que el subject y body estén en español
   - **Subject sugerido**: "Restablece tu contraseña - Depósito Dental Noriega"
   - **Body**: Incluye branding DDN y el link de recuperación
4. En "URL Configuration", agrega:
   - **Site URL**: `https://ddnshop.mx` (o tu dominio de producción)
   - **Redirect URLs**: 
     - `https://ddnshop.mx/**` (permite cualquier ruta)
     - `https://ddnshop.mx/auth/callback**` (específico para callbacks)
   - ⚠️ **IMPORTANTE**: Mantén también el dominio viejo si aplica durante la migración

## 💳 Paso 2: Configurar Stripe

### 2.1 Configuración inicial

1. Ve a [dashboard.stripe.com](https://dashboard.stripe.com)
2. Activa el modo de prueba (toggle arriba a la derecha)
3. Ve a "Developers" → "API keys"
4. Copia:
   - `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY`

### 2.2 Configurar Webhook (después del deployment)

⚠️ **IMPORTANTE**: Hazlo DESPUÉS de desplegar en Vercel

1. Ve a "Developers" → "Webhooks"
2. Click en "Add endpoint"
3. Endpoint URL: `https://tu-dominio.com/api/stripe/webhook`
4. Selecciona eventos:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
5. Click en "Add endpoint"
6. En la página del webhook, click en "Reveal" en "Signing secret"
7. Copia el secreto → `STRIPE_WEBHOOK_SECRET`

## 🚀 Paso 3: Deploy en Vercel

### 3.1 Preparar repositorio

1. Push tu código a GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git push -u origin main
   ```

### 3.2 Importar en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Click en "Add New" → "Project"
3. Importa tu repositorio de GitHub
4. Framework Preset: Next.js (auto-detectado)
5. **NO HAGAS CLICK EN DEPLOY TODAVÍA**

### 3.3 Configurar variables de entorno

En la sección "Environment Variables", agrega:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (déjalo vacío por ahora)
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
```

### 3.4 Desplegar

1. Click en "Deploy"
2. Espera a que termine (2-5 minutos)
3. Copia la URL de producción

### 3.5 Actualizar Stripe Webhook

1. Ahora que tienes la URL, vuelve a Stripe Dashboard
2. Configura el webhook como se explicó en el Paso 2.2
3. Copia el `STRIPE_WEBHOOK_SECRET`
4. Ve a Vercel → Project Settings → Environment Variables
5. Agrega/actualiza `STRIPE_WEBHOOK_SECRET`
6. Re-deploya (Deployments → "..." → Redeploy)

### 3.6 Actualizar Supabase

1. Ve a Supabase → Authentication → URL Configuration
2. Actualiza Site URL y Redirect URLs con tu dominio de Vercel

## 🧪 Paso 4: Testing en Producción

### 4.1 Test de autenticación

1. Ve a tu sitio
2. Crea una cuenta nueva
3. Verifica que recibas el email de confirmación
4. Confirma la cuenta

### 4.2 Test de carrito

1. Agrega productos al carrito
2. Cierra sesión
3. Vuelve a iniciar sesión
4. Verifica que el carrito se haya fusionado

### 4.3 Test de checkout con Stripe

⚠️ **USA TARJETAS DE PRUEBA**

1. Tarjeta exitosa: `4242 4242 4242 4242`
2. Completa el checkout
3. Verifica que:
   - El pedido aparezca en "Mis Pedidos"
   - Los puntos se hayan acreditado
   - El carrito se haya vaciado

### 4.4 Test de webhook

1. Ve a Stripe Dashboard → Developers → Webhooks
2. Click en tu webhook
3. Ve a la pestaña "Events"
4. Deberías ver el evento `checkout.session.completed`
5. Si está en verde ✅, el webhook funciona correctamente

## 🎬 Paso 5: Producción Real

Cuando estés listo para producción:

### 5.1 Stripe en modo Live

1. En Stripe Dashboard, desactiva el modo de prueba
2. Ve a "Developers" → "API keys"
3. Obtén las keys de **producción** (sin `_test_`)
4. Crea un nuevo webhook (modo live)
5. Actualiza las variables en Vercel con las keys de producción

### 5.2 Verificaciones finales

- [ ] Todas las URLs apuntan al dominio correcto
- [ ] Webhook de Stripe configurado y funcionando
- [ ] Storage de Supabase tiene el bucket `avatars`
- [ ] RLS está habilitado en todas las tablas
- [ ] Email templates de Supabase personalizados (opcional)
- [ ] Dominio custom configurado (opcional)

## 📊 Monitoreo

### Logs de Vercel

1. Ve a tu proyecto en Vercel
2. Click en "Logs" para ver errores en tiempo real

### Logs de Stripe

1. Stripe Dashboard → Developers → Webhooks
2. Revisa los eventos y sus respuestas

### Logs de Supabase

1. Supabase → Logs
2. Revisa queries y autenticación

## 🐛 Troubleshooting

### Error: "No autenticado"

- Verifica que las variables de Supabase estén correctas
- Revisa que el dominio esté en Redirect URLs de Supabase

### Webhook falla

- Verifica que el `STRIPE_WEBHOOK_SECRET` sea correcto
- Revisa los logs en Vercel
- Asegúrate de que la URL del webhook esté bien escrita

### Carrito no persiste

- Verifica que las políticas RLS estén correctas
- Revisa la consola del navegador

### Pagos no se procesan

- Verifica que las keys de Stripe sean correctas
- Asegúrate de usar tarjetas de prueba en modo test
- Revisa los logs de Stripe

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs en Vercel
2. Revisa la consola del navegador
3. Revisa los eventos en Stripe Dashboard
4. Verifica las variables de entorno

## 🎉 ¡Listo!

Tu e-commerce está desplegado y funcionando. Ahora puedes:

- Personalizar el diseño
- Agregar más productos
- Configurar envío automático de emails
- Integrar con tu sistema de inventario
- Agregar analytics

¡Buenas ventas! 🚀
