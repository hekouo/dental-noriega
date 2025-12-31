# Configuración de Reset Password

Este documento describe la configuración completa del flujo de recuperación de contraseña.

## Flujo Completo

1. Usuario ingresa email en `/forgot-password`
2. Se envía email con link de recuperación (Supabase Auth)
3. Usuario hace clic en el link → redirige a `/auth/callback?type=recovery&next=/reset-password`
4. Callback intercambia `code` por sesión válida
5. Usuario es redirigido a `/reset-password` con sesión activa
6. Usuario ingresa nueva contraseña
7. Se actualiza la contraseña y se cierra sesión
8. Usuario es redirigido a `/cuenta` para iniciar sesión

## Configuración de Supabase Auth

### 1. Site URL y Redirect URLs

En Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://ddnshop.mx`
- **Redirect URLs**:
  - `https://ddnshop.mx/**` (permite cualquier ruta)
  - `https://ddnshop.mx/auth/callback**` (específico para callbacks)

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

### El link no funciona

1. Verifica que el link tenga el formato: `https://ddnshop.mx/auth/callback?code=xxx&type=recovery`
2. Verifica que `/auth/callback` esté configurado correctamente
3. Revisa los logs del servidor para ver errores de `exchangeCodeForSession`

### El usuario no puede cambiar la contraseña

1. Verifica que la sesión se haya creado correctamente después del callback
2. Revisa que `/reset-password` verifique la sesión antes de permitir el cambio
3. Verifica que `updatePasswordAction` esté funcionando correctamente

## Pruebas Manuales

1. **Solicitar reset password**:
   - Ve a `/forgot-password`
   - Ingresa un email válido
   - Verifica que aparezca mensaje de éxito

2. **Verificar email**:
   - Revisa el correo (y spam)
   - Verifica que el subject y body estén en español
   - Verifica que el link apunte a `https://ddnshop.mx/auth/callback?...`

3. **Probar link**:
   - Haz clic en el link del email
   - Verifica que redirija a `/reset-password`
   - Verifica que no aparezca error de sesión

4. **Cambiar contraseña**:
   - Ingresa nueva contraseña (mínimo 6 caracteres)
   - Confirma la contraseña
   - Verifica que aparezca mensaje de éxito
   - Verifica que redirija a `/cuenta`

5. **Probar rate limiting**:
   - Solicita otro enlace inmediatamente
   - Verifica que aparezca mensaje de cooldown
   - Espera 60 segundos y verifica que funcione

