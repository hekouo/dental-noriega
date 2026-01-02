# Configuración de Reset Password

Este documento describe la configuración completa del flujo de recuperación de contraseña.

## Flujo Completo

1. Usuario ingresa email en `/forgot-password`
2. Se envía email con link de recuperación (Supabase Auth)
3. Usuario hace clic en el link → redirige directamente a `/reset-password` con `code` en query o tokens en hash
4. `/reset-password` procesa el `code`/tokens y crea sesión válida automáticamente
5. Usuario ingresa nueva contraseña
6. Se actualiza la contraseña y se cierra sesión
7. Usuario es redirigido a `/cuenta` para iniciar sesión

**Nota**: El flujo ahora procesa la autenticación directamente en `/reset-password` (Plan B robusto), eliminando la dependencia de `/auth/callback` y evitando pérdida de query params.

## Configuración de Supabase Auth

### 1. Site URL y Redirect URLs

En Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://ddnshop.mx`
- **Redirect URLs** (deben incluir):
  - `https://ddnshop.mx/**` (permite cualquier ruta)
  - `https://ddnshop.mx/reset-password` (específico para reset password - Plan B robusto)
  - `https://ddnshop.mx/auth/callback**` (opcional, para otros flujos de auth como signup)

⚠️ **Nota**: Si tienes un dominio viejo, mantenlo temporalmente en Redirect URLs durante la migración.

### 2. Email Templates

En Supabase Dashboard → Authentication → Email Templates → Reset Password:

**Subject** (sugerido):
```
Restablece tu contraseña - Depósito Dental Noriega
```

**Body HTML** (sugerido):
```html
<h2>Restablece tu contraseña</h2>
<p>Hola,</p>
<p>Recibimos una solicitud para restablecer tu contraseña en Depósito Dental Noriega.</p>
<p>Haz clic en el siguiente enlace para continuar:</p>
<p><a href="{{ .ConfirmationURL }}">Restablecer contraseña</a></p>
<p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
<p>Este enlace expira en 1 hora.</p>
<hr>
<p><small>Depósito Dental Noriega - Insumos y equipos dentales</small></p>
```

**Variables disponibles**:
- `{{ .ConfirmationURL }}` - URL completa con código de recuperación
- `{{ .Email }}` - Email del usuario
- `{{ .SiteURL }}` - URL base del sitio

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

## Pruebas Manuales (sin enviar emails)

### Usando Supabase Admin API

Puedes generar un link de recovery sin enviar email usando la función `admin.generateLink`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Solo en servidor, nunca en cliente
)

const { data, error } = await supabase.auth.admin.generateLink({
  type: 'recovery',
  email: 'usuario@ejemplo.com',
  options: {
    redirectTo: 'https://ddnshop.mx/reset-password'
  }
})

console.log('Link de recovery:', data.properties.action_link)
```

**⚠️ IMPORTANTE**: `SUPABASE_SERVICE_ROLE_KEY` solo debe usarse en servidor (API routes, server actions), nunca en código del cliente.

## Pruebas Manuales en Producción

### Pasos para validar el flujo completo:

1. **Solicitar reset password**:
   - Ve a `https://ddnshop.mx/forgot-password`
   - Ingresa un email válido
   - Verifica que aparezca mensaje de éxito

2. **Verificar email**:
   - Revisa el correo (y spam)
   - Verifica que el subject y body estén en español
   - Verifica que el link apunte a `https://ddnshop.mx/reset-password?...` (Plan B robusto)
   - **IMPORTANTE**: Copia el link completo antes de hacer clic

3. **Validar formato del link**:
   - El link debe tener uno de estos formatos:
     - `https://ddnshop.mx/reset-password?code=xxx` (query params)
     - `https://ddnshop.mx/reset-password#access_token=xxx&refresh_token=xxx` (hash)
   - Si el link no tiene `code` ni `access_token`, hay un problema en Supabase
   - Si el link apunta a `/auth/callback`, actualiza `redirectTo` en `forgotPasswordAction`

4. **Probar link (paso crítico)**:
   - Abre el link en una ventana de incógnito
   - Abre DevTools (F12) → Console
   - Busca logs que empiecen con `[reset-password]`
   - Si `NEXT_PUBLIC_DEBUG_AUTH_CALLBACK=true`, verás información de debug en la UI
   - Verifica que aparezca:
     - `Debug info:` con `hasQuery: true` o `hasHash: true`
     - Si ves `hasQuery: false` y `hasHash: false`, el query string se perdió en algún redirect
   - Si todo está bien, debería procesar el code/tokens y mostrar el formulario de cambio de contraseña

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
   - Busca logs `[reset-password]`
   - Verifica qué parámetros se detectaron
   - Si `NEXT_PUBLIC_DEBUG_AUTH_CALLBACK=true`, también verás info en la UI

2. **Verificar URL completa**:
   - Antes de hacer clic, copia el link completo del email
   - Pégala en un editor de texto
   - Verifica que tenga `?code=` o `#access_token=`

3. **Probar link directo**:
   - Pega el link completo en la barra de direcciones
   - Presiona Enter (no uses "Abrir enlace" del email)
   - Verifica si funciona

4. **Revisar redirects de Vercel**:
   - Ve a Vercel Dashboard → Project → Settings → Redirects
   - Verifica que NO haya redirects que afecten `/reset-password`
   - Si hay redirects, asegúrate de que preserven query params
   - **Culpable común**: Redirects de www→apex o trailing slash que reconstruyen URL sin query params

5. **Revisar configuración de dominio**:
   - Verifica que el dominio `ddnshop.mx` esté correctamente configurado
   - Verifica que no haya redirects a nivel de DNS o CDN que eliminen query params

