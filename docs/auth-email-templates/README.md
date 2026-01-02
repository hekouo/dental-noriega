# Templates de Email de Supabase Auth

Este directorio contiene snapshots de los templates de email configurados en Supabase Dashboard para autenticación.

## 📋 Uso

Estos templates se copian y pegan directamente en **Supabase Dashboard > Authentication > Email Templates**.

**⚠️ IMPORTANTE**: 
- Estos son snapshots de los templates actuales en producción.
- Cualquier cambio en el dashboard debe reflejarse aquí para mantener trazabilidad.
- Los templates son "copy/paste friendly" para facilitar su uso en el dashboard.

## 📊 Resumen de Templates

| Template | Dónde se configura | Variable principal | Acción / Ruta destino |
|----------|---------------------|-------------------|----------------------|
| **Reset Password** | Authentication > Email Templates > Reset Password | `{{ .TokenHash }}` | `/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password` |
| **Confirm Signup** | Authentication > Email Templates > Confirm Signup | `{{ .ConfirmationURL }}` | `/auth/callback` (o ruta configurada en `redirectTo`) |
| **Magic Link** | Authentication > Email Templates > Magic Link | `{{ .ConfirmationURL }}` | `/auth/callback` (o ruta configurada en `redirectTo`) |
| **Change Email Address** | Authentication > Email Templates > Change Email Address | `{{ .ConfirmationURL }}` | `/auth/callback` (o ruta configurada en `redirectTo`) |
| **Invite User** | Authentication > Email Templates > Invite User | `{{ .ConfirmationURL }}` | `/auth/callback` (o ruta configurada en `redirectTo`) |
| **Reauthentication** | Authentication > Email Templates > Reauthentication | `{{ .ConfirmationURL }}` | `/auth/callback` (o ruta configurada en `redirectTo`) |

## 🔒 Nota sobre Protección contra Link Scanners

El template **Reset Password** usa el flujo `/auth/confirm` que implementa protección contra link scanners:

- El link del email apunta a `/auth/confirm?token_hash=...&type=recovery&next=/reset-password`
- La página `/auth/confirm` muestra un botón "Continuar" (no consume el token automáticamente)
- Solo cuando el usuario hace clic en "Continuar", se hace POST a `/auth/confirm/api` que consume el token con `verifyOtp(token_hash)`
- Esto evita que scanners de email (Gmail, antivirus, etc.) consuman el token al hacer GET automático

## ✅ Checklist de Configuración en Supabase

Antes de hacer deploy o después de cambios, verificar:

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
- [ ] **Confirm Signup**: Verificar que use `{{ .ConfirmationURL }}` o ruta personalizada
- [ ] **Magic Link**: Verificar que use `{{ .ConfirmationURL }}` o ruta personalizada
- [ ] **Change Email Address**: Verificar que use `{{ .ConfirmationURL }}` o ruta personalizada
- [ ] **Invite User**: Verificar que use `{{ .ConfirmationURL }}` o ruta personalizada
- [ ] **Reauthentication**: Verificar que use `{{ .ConfirmationURL }}` o ruta personalizada

### 3. Variables Disponibles en Templates

Supabase proporciona estas variables en los templates:

- `{{ .SiteURL }}` - URL base del sitio (ej: `https://ddnshop.mx`)
- `{{ .TokenHash }}` - Hash del token (usado en Reset Password con `/auth/confirm`)
- `{{ .Token }}` - Token completo (usado en algunos flujos)
- `{{ .ConfirmationURL }}` - URL completa de confirmación (usa `/auth/v1/verify` de Supabase)
- `{{ .Email }}` - Email del usuario
- `{{ .RedirectTo }}` - URL de redirección después de confirmación

**Nota**: Para Reset Password, preferir `{{ .TokenHash }}` con `/auth/confirm` en lugar de `{{ .ConfirmationURL }}` para evitar pérdida de query params.

## 🔄 Actualizar Templates

Si se modifica un template en Supabase Dashboard:

1. Copiar el HTML completo del template
2. Pegarlo en el archivo correspondiente en `docs/auth-email-templates/`
3. Hacer commit con mensaje descriptivo: `docs(auth): update [template-name] email template`
4. Actualizar este README si cambia la ruta destino o variables usadas

## 📚 Referencias

- [Supabase Auth Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Auth URL Configuration](https://supabase.com/docs/guides/auth/auth-urls)
- [Reset Password Setup](./../RESET_PASSWORD_SETUP.md)

