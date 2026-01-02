# Configuración de Reset Password

Este documento describe la configuración completa del flujo de recuperación de contraseña.

## Flujo Completo

1. Usuario ingresa email en `/forgot-password`
2. Se envía email con link de recuperación (Supabase Auth)
3. Usuario hace clic en el link → redirige a `/auth/confirm?token_hash=...&type=recovery&next=/reset-password`
4. `/auth/confirm` muestra botón "Continuar" (protección contra link scanners)
5. Usuario hace clic en "Continuar" → POST a `/auth/confirm` → `verifyOtp(token_hash)` → crea sesión válida
6. Redirige a `/reset-password` con sesión activa
7. Usuario ingresa nueva contraseña
8. Se actualiza la contraseña y se cierra sesión
9. Usuario es redirigido a `/cuenta` para iniciar sesión

**Nota**: Este flujo usa el patrón recomendado de Supabase (`/auth/confirm` + `verifyOtp`) y NO depende de `/auth/v1/verify` ni de hashes/codes que se pierden en redirects.

## Configuración de Supabase Auth

### 1. Site URL y Redirect URLs

En Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://ddnshop.mx`
- **Redirect URLs** (deben incluir):
  - `https://ddnshop.mx/**` (permite cualquier ruta)
  - `https://ddnshop.mx/auth/confirm**` (específico para confirmación con token_hash)
  - `https://ddnshop.mx/reset-password` (específico para reset password)
  - `https://ddnshop.mx/auth/callback**` (opcional, para otros flujos de auth como signup)

**⚠️ IMPORTANTE**: Ya NO dependemos de `/auth/v1/verify` de Supabase. El flujo usa `/auth/confirm` con `verifyOtp(token_hash)`.

⚠️ **Nota**: Si tienes un dominio viejo, mantenlo temporalmente en Redirect URLs durante la migración.

### 2. Email Templates

En Supabase Dashboard → Authentication → Email Templates → Reset Password:

**Subject** (sugerido):
```
Restablece tu contraseña - Depósito Dental Noriega
```

**Body HTML** (CRÍTICO - usar este formato exacto):
```html
<h2>Restablece tu contraseña</h2>
<p>Hola,</p>
<p>Recibimos una solicitud para restablecer tu contraseña en Depósito Dental Noriega.</p>
<p>Haz clic en el siguiente enlace para continuar:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Restablecer contraseña</a></p>
<p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
<p>Este enlace expira en 1 hora.</p>
<hr>
<p><small>Depósito Dental Noriega - Insumos y equipos dentales</small></p>
```

**⚠️ IMPORTANTE**: 
- **NO usar** `{{ .ConfirmationURL }}` (ese usa `/auth/v1/verify` que puede perder query params)
- **Usar** `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
- Esto asegura que el link apunte a nuestra ruta `/auth/confirm` que usa `verifyOtp(token_hash)`

**Variables disponibles**:
- `{{ .SiteURL }}` - URL base del sitio (https://ddnshop.mx)
- `{{ .TokenHash }}` - Hash del token de recuperación
- `{{ .Email }}` - Email del usuario

### 3. Configuración de SMTP (Opcional)

Si quieres usar tu propio SMTP (Resend) en lugar del SMTP de Supabase:

1. Ve a Supabase Dashboard → Authentication → SMTP Settings
2. Configura:
   - **SMTP Host**: `smtp.resend.com`
   - **SMTP Port**: `465` (SSL) o `587` (TLS)
   - **SMTP User**: `resend`
   - **SMTP Password**: Tu API key de Resend
   - **Sender email**: `ventas@mail.ddnshop.mx`
   - **Sender name**: `Depósito Dental Noriega`

⚠️ **Nota**: El email de reset password lo envía Supabase directamente, no Resend. Resend solo se usa para emails transaccionales (confirmación de pedidos, etc.).

## Variables de Entorno

En Vercel, asegúrate de tener:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Site URL (usado para redirectTo)
NEXT_PUBLIC_SITE_URL=https://ddnshop.mx

# Email (para otros emails transaccionales, no para reset password)
EMAIL_ENABLED=true
RESEND_API_KEY=re_xxx
EMAIL_FROM=Depósito Dental Noriega <ventas@mail.ddnshop.mx>
```

## Rate Limiting

El frontend implementa rate limiting de 60 segundos entre solicitudes de reset password para evitar spam:

- Si el usuario intenta solicitar otro enlace antes de 60 segundos, verá un mensaje indicando cuántos segundos faltan
- Esto reduce envíos innecesarios de correos

## Validaciones

### Frontend (`/forgot-password`)

- Email no vacío
- Email válido (formato)
- Rate limiting (60s cooldown)

### Backend (`forgotPasswordAction`)

- Email válido (Zod schema)
- Email no vacío (doble validación)
- Siempre devuelve `success: true` (por seguridad, no revela si el email existe)

## Logs

El código registra logs sin exponer información sensible:

- `[forgotPasswordAction] Error:` - Solo primeros 3 caracteres del email
- `[auth/callback] Error exchanging code:` - Mensaje de error sin tokens
- `[reset-password] Error checking session:` - Errores de sesión

## Troubleshooting

### El email no llega

1. Revisa la carpeta de spam
2. Verifica que el email esté correcto en Supabase Dashboard
3. Revisa los logs de Supabase Dashboard → Authentication → Logs
4. Verifica que Site URL y Redirect URLs estén correctos

### El link no funciona / "No se encontró código de autenticación ni tokens"

**Síntoma**: Al abrir el link de Supabase, llegas a `/reset-password` pero ves el error "No se encontró código de autenticación ni tokens".

**Causas posibles**:

1. **Query string perdido en redirect**:
   - Verifica que el link del email tenga `?code=...` o `#access_token=...`
   - Si el link no tiene estos parámetros, el problema está en Supabase (verifica Redirect URLs)
   - Si el link SÍ tiene parámetros pero no llegan a la página, hay un redirect que los elimina

2. **Redirects en Vercel**:
   - Ve a Vercel Dashboard → Project → Settings → Redirects
   - Verifica que NO haya redirects que afecten `/auth/callback`
   - Si hay redirects, deben preservar query params: `destination: '/auth/callback?$1'` (Next.js lo hace automáticamente, pero verifica)

3. **Redirects en next.config.mjs**:
   - Verifica que no haya `redirects()` configurados que afecten `/auth/callback`
   - Si hay redirects, deben excluir explícitamente `/auth/callback` y `/reset-password`

4. **Middleware activo**:
   - Verifica que NO exista `middleware.ts` en la raíz del proyecto
   - Si existe, debe excluir `/auth/callback` y `/reset-password` de cualquier procesamiento

5. **Problema de timing en Client Component**:
   - El código ya lee `window.location.search` y `window.location.hash` directamente
   - Si aún así no funciona, revisa los logs del navegador para ver qué se detectó

**Solución**:

1. **Habilita debug temporal** (solo en producción para diagnóstico):
   - En Vercel, agrega variable de entorno: `NEXT_PUBLIC_DEBUG_AUTH_CALLBACK=true`
   - Esto mostrará información de debug en la UI sin exponer tokens
2. Abre DevTools → Console al hacer clic en el link
3. Busca logs `[reset-password] Debug info:` o `[reset-password] Error exchanging code:`
4. Verifica:
   - `hasQuery: true` → El query string llegó
   - `hasHash: true` → El hash llegó
   - Si ambos son `false`, el problema está ANTES de llegar a la página (redirects de Vercel/DNS)
5. Si `hasQuery: true` pero `hasCode: false`, el query string llegó pero no tiene `code=`
6. Revisa los logs de Supabase Dashboard → Authentication → Logs para ver qué URL se generó
7. **Verifica que `redirectTo` en `forgotPasswordAction` apunte a `/reset-password`** (no `/auth/callback`)

### El usuario no puede cambiar la contraseña

1. Verifica que la sesión se haya creado correctamente después del callback
2. Revisa que `/reset-password` verifique la sesión antes de permitir el cambio
3. Verifica que `updatePasswordAction` esté funcionando correctamente

## Pruebas sin enviar emails (no consumir cuota)

### ⚠️ IMPORTANTE: Ahorro de correos

Para probar el flujo de reset password **sin gastar envíos de email**, puedes usar la Admin API de Supabase para generar el link directamente.

### Usando Supabase Admin API

**⚠️ CRÍTICO**: Este código **SOLO debe ejecutarse en servidor** (API routes, server actions), **NUNCA en el cliente**.

```typescript
// Server-side ONLY (API route o server action)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Solo en servidor, NUNCA en cliente
)

const { data, error } = await supabase.auth.admin.generateLink({
  type: 'recovery',
  email: 'usuario@ejemplo.com',
  options: {
    redirectTo: 'https://ddnshop.mx/reset-password'
  }
})

if (error) {
  console.error('Error generando link:', error)
} else {
  console.log('Link de recovery:', data?.properties?.action_link)
  // Copia este link y ábrelo en el navegador
  // Debe abrir /reset-password con query/hash y permitir cambio de contraseña
}
```

### Ejemplo: API Route para testing

Puedes crear temporalmente `src/app/api/test/recovery-link/route.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // ⚠️ Solo en desarrollo/testing, proteger en producción
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: 'https://ddnshop.mx/auth/confirm?type=recovery&next=/reset-password'
    }
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    link: data?.properties?.action_link,
    message: 'Copia este link y ábrelo en el navegador para probar el flujo'
  })
}
```

Luego accede a: `http://localhost:3000/api/test/recovery-link?email=tu@email.com`

### Validación del link generado

1. El link debe apuntar a `https://ddnshop.mx/auth/confirm?token_hash=...&type=recovery&next=/reset-password`
2. Debe tener `token_hash` en query params
3. Al abrirlo, debe mostrar `/auth/confirm` con botón "Continuar"
4. Al hacer clic en "Continuar", debe redirigir a `/reset-password` con sesión válida
5. Debe permitir cambiar la contraseña y redirigir a `/cuenta` después

**Nota**: Elimina el API route de testing antes de hacer deploy a producción.

## Pruebas Manuales en Producción

### Pasos para validar el flujo completo:

1. **Solicitar reset password**:
   - Ve a `https://ddnshop.mx/forgot-password`
   - Ingresa un email válido
   - Verifica que aparezca mensaje de éxito

2. **Verificar email**:
   - Revisa el correo (y spam)
   - Verifica que el subject y body estén en español
   - Verifica que el link apunte a `https://ddnshop.mx/auth/confirm?token_hash=...&type=recovery&next=/reset-password`
   - **IMPORTANTE**: Copia el link completo antes de hacer clic

3. **Validar formato del link**:
   - El link debe tener este formato:
     - `https://ddnshop.mx/auth/confirm?token_hash=xxx&type=recovery&next=/reset-password`
   - Si el link no tiene `token_hash`, hay un problema en el template de Supabase
   - Si el link apunta a `/auth/v1/verify` o `/reset-password`, actualiza el template en Supabase Dashboard

4. **Probar link (paso crítico)**:
   - Abre el link en una ventana de incógnito
   - Debe mostrar `/auth/confirm` con botón "Continuar" (protección contra link scanners)
   - Haz clic en "Continuar"
   - Debe redirigir a `/reset-password` con sesión válida
   - Debe mostrar el formulario de cambio de contraseña

5. **Cambiar contraseña**:
   - En `/reset-password`, ingresa nueva contraseña (mínimo 6 caracteres)
   - Confirma la contraseña
   - Verifica que aparezca mensaje de éxito
   - Verifica que redirija a `/cuenta` para iniciar sesión

6. **Probar rate limiting**:
   - Solicita otro enlace inmediatamente
   - Verifica que aparezca mensaje de cooldown
   - Espera 60 segundos y verifica que funcione

### Debug en producción

Si el link no funciona:

1. **Revisar logs del navegador**:
   - Abre DevTools → Console
   - Busca logs `[auth/confirm]` o `[reset-password]`
   - Verifica si hay errores al hacer POST a `/auth/confirm/api`

2. **Verificar URL completa**:
   - Antes de hacer clic, copia el link completo del email
   - Pégala en un editor de texto
   - Verifica que tenga `?token_hash=` y `&type=recovery`

3. **Probar link directo**:
   - Pega el link completo en la barra de direcciones
   - Presiona Enter (no uses "Abrir enlace" del email)
   - Verifica si funciona

4. **Revisar redirects de Vercel**:
   - Ve a Vercel Dashboard → Project → Settings → Redirects
   - Verifica que NO haya redirects que afecten `/auth/confirm` o `/reset-password`
   - Si hay redirects, asegúrate de que preserven query params
   - **Culpable común**: Redirects de www→apex o trailing slash que reconstruyen URL sin query params

5. **Revisar configuración de dominio**:
   - Verifica que el dominio `ddnshop.mx` esté correctamente configurado
   - Verifica que no haya redirects a nivel de DNS o CDN que eliminen query params

## Post-deploy Checklist: Supabase Auth + Email Templates

Después de hacer deploy o cambios en la configuración de autenticación, verificar:

### 1. Site URL y Redirect URLs

En **Supabase Dashboard > Authentication > URL Configuration**:

- [ ] **Site URL** = `https://ddnshop.mx`
- [ ] **Redirect URLs** incluyen:
  - `https://ddnshop.mx/**` (permite cualquier ruta)
  - `https://ddnshop.mx/auth/confirm**` (específico para confirmación con token_hash)
  - `https://ddnshop.mx/reset-password` (específico para reset password)
  - `https://ddnshop.mx/auth/callback**` (para otros flujos como signup, magic link)

### 2. Templates de Email

En **Supabase Dashboard > Authentication > Email Templates**:

- [ ] **Reset Password**: 
  - Verificar que el link use: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
  - ⚠️ **NO usar** `{{ .ConfirmationURL }}` (ese usa `/auth/v1/verify` que puede perder query params)
- [ ] Revisar otros templates (Confirm Signup, Magic Link, etc.) según necesidad
- [ ] Ver snapshots actuales en [`docs/auth-email-templates/`](./auth-email-templates/README.md)

### 3. Prueba End-to-End (sin spamear)

**⚠️ IMPORTANTE**: No enviar múltiples correos de prueba. Usar uno de estos métodos:

#### Opción A: Prueba Real (1 intento)
1. Solicitar reset password en `/forgot-password` con un email real
2. Verificar que el correo llegue (revisar spam si es necesario)
3. Verificar que el link apunte a `/auth/confirm?token_hash=...`
4. Hacer clic en "Continuar" y verificar que redirija a `/reset-password`
5. Cambiar contraseña y verificar que funcione

#### Opción B: Testing sin Enviar Emails (Recomendado)
Usar `admin.generateLink` server-side para generar el link sin consumir cuota de emails:

```typescript
// Server-side ONLY (API route o server action)
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Solo en servidor
)

const { data, error } = await supabase.auth.admin.generateLink({
  type: 'recovery',
  email: 'usuario@ejemplo.com',
  options: {
    redirectTo: 'https://ddnshop.mx/auth/confirm?type=recovery&next=/reset-password'
  }
})

console.log('Link de recovery:', data?.properties?.action_link)
```

Ver más detalles en [Pruebas sin enviar emails](./RESET_PASSWORD_SETUP.md#pruebas-sin-enviar-emails-no-consumir-cuota).

### 4. Verificar Logs

Después de la prueba:
- [ ] Revisar logs del navegador (DevTools > Console) para errores
- [ ] Revisar logs de Supabase Dashboard > Logs > Auth para errores de verificación
- [ ] Si hay errores, revisar que las Redirect URLs estén correctamente configuradas

### Referencias

- [Templates de Email - Snapshots](./auth-email-templates/README.md)
- [Supabase Auth URL Configuration](https://supabase.com/docs/guides/auth/auth-urls)

