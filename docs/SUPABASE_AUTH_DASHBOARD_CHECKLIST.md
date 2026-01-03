# Checklist de Configuración: Supabase Auth Dashboard

Este documento describe la configuración actual de Supabase Auth para Depósito Dental Noriega, enfocada en **Rate Limits** y **Attack Protection**.

**Última actualización**: 2026-01-02  
**Configurado por**: Equipo de desarrollo  
**Plan Supabase**: FREE (sin custom SMTP)

---

## 📊 Rate Limits (Auth)

Los rate limits protegen contra abuso y ataques de fuerza bruta. Se configuran en **Supabase Dashboard > Authentication > Rate Limits**.

### ⚙️ Configuración Recomendada Actual

| Campo | Valor Recomendado | Explicación |
|-------|-------------------|-------------|
| **Sending emails** | `2 emails/hour` | Límite de emails enviados por usuario. **Nota**: Solo cambia si tienes custom SMTP (Resend/SendGrid). Con SMTP de Supabase, este límite es fijo. |
| **Token refreshes** | `150 requests / 5 minutes` | Límite de renovaciones de token por IP. Alto porque las apps hacen refresh automático. |
| **Token verifications** | `30 requests / 5 minutes` | Límite de verificaciones de token (ej: `verifyOtp`). |
| **Sign-ups & sign-ins** | `30 requests / 5 minutes` | Límite combinado de registros e inicios de sesión por IP. |
| **SMS** | `0` (deshabilitado) | No se usa SMS en este proyecto. |

### ⚠️ Por qué NO bajar demasiado los límites

**Problemas comunes con límites muy bajos**:

1. **NAT (Network Address Translation)**: 
   - Varios usuarios detrás de la misma IP pública (oficina, clínica, coworking)
   - Si 5 usuarios intentan reset password, pueden alcanzar el límite rápidamente
   - **Recomendación**: Mantener límites razonables (30+ requests/5min)

2. **Clínicas/Coworkings**:
   - Múltiples empleados desde la misma IP
   - Intentos legítimos de login pueden ser bloqueados
   - **Recomendación**: Usar Captcha en lugar de bajar límites drásticamente

3. **Apps móviles/SPA**:
   - Refresh automático de tokens puede consumir límites rápidamente
   - **Recomendación**: Mantener `token refreshes` alto (150+)

### 🔧 Cómo Configurar

1. Ve a **Supabase Dashboard > Authentication > Rate Limits**
2. Ajusta cada campo según la tabla arriba
3. Guarda cambios
4. **Importante**: Los cambios aplican inmediatamente, no requieren deploy

---

## 🛡️ Attack Protection

### 1. Captcha Protection

**Estado actual**: No configurado (opcional pero recomendado)

**Proveedores soportados**:
- **hCaptcha** (recomendado, gratuito)
- **Cloudflare Turnstile** (gratuito, sin tracking)
- **reCAPTCHA v3** (Google, requiere cuenta)

**Cómo configurar**:
1. Ve a **Supabase Dashboard > Authentication > Providers > Email**
2. Scroll hasta "Captcha Protection"
3. Selecciona proveedor (hCaptcha o Turnstile recomendados)
4. Ingresa Site Key y Secret Key
5. Guarda cambios

**Documentación oficial**: [Supabase Captcha Protection](https://supabase.com/docs/guides/auth/auth-captcha)

**Nota**: Captcha se aplica automáticamente a:
- Sign up
- Sign in
- Password reset requests
- Magic link requests

### 2. Leaked Passwords Protection

**Estado actual**: No disponible (requiere Pro plan)

Esta feature verifica si la contraseña del usuario está en bases de datos de contraseñas filtradas (Have I Been Pwned).

**Requisitos**:
- Plan Supabase **Pro** o superior
- Se configura en **Authentication > Policies**

**Alternativa en FREE**: Validar contraseñas fuertes en el frontend (mínimo 8 caracteres, mayúsculas, números).

---

## ✅ Cómo Verificar que Quedó Bien (5 minutos)

### Paso 1: Probar Sign Up

1. Ve a `https://ddnshop.mx/cuenta` (o localhost en dev)
2. Click en "Registrarse"
3. Ingresa email y contraseña válidos
4. Verifica que:
   - Se envía email de confirmación
   - No aparece error de rate limit
   - Si Captcha está activo, aparece el challenge

### Paso 2: Probar Sign In

1. Con una cuenta existente, intenta iniciar sesión
2. Verifica que:
   - Login funciona correctamente
   - No aparece error de rate limit
   - Si Captcha está activo, aparece el challenge

### Paso 3: Probar Forgot Password

1. Ve a `https://ddnshop.mx/forgot-password`
2. Ingresa un email válido
3. Verifica que:
   - Se envía email de reset
   - El link apunta a `/auth/confirm?token_hash=...`
   - No aparece error de rate limit

### Paso 4: Probar Reset Password (E2E)

1. Abre el email de reset password
2. Haz clic en el link
3. Verifica que:
   - Llega a `/auth/confirm` con botón "Continuar"
   - Al hacer clic, redirige a `/reset-password`
   - Permite cambiar contraseña
   - Redirige a `/cuenta` después de cambiar

### Paso 5: Revisar Audit Logs (si aplica)

1. Ve a **Supabase Dashboard > Logs > Auth Logs**
2. Verifica que:
   - Los eventos aparecen correctamente
   - No hay errores inesperados
   - Los rate limits se aplican cuando corresponde

**Nota**: En plan FREE, los logs pueden tener retención limitada.

---

## 📝 Checklist Post-Deploy

Después de hacer cambios en Rate Limits o Attack Protection:

- [ ] Verificar que los rate limits están configurados según la tabla arriba
- [ ] Si se activó Captcha, probar signup/signin para verificar que aparece
- [ ] Probar flujo completo: signup → confirm email → login → forgot password → reset password
- [ ] Revisar logs de Supabase para errores relacionados con rate limits
- [ ] Documentar cualquier cambio en este archivo

---

## 🔗 Referencias

- [Supabase Auth Rate Limits](https://supabase.com/docs/guides/auth/auth-rate-limits)
- [Supabase Captcha Protection](https://supabase.com/docs/guides/auth/auth-captcha)
- [Reset Password Setup](./RESET_PASSWORD_SETUP.md)
- [Email Templates](./auth-email-templates/README.md)

---

## 📌 Notas Importantes

1. **Plan FREE**: Algunas features (como Leaked Passwords Protection) requieren Pro plan
2. **Custom SMTP**: Si se configura Resend/SendGrid, el límite de "Sending emails" puede ajustarse
3. **Captcha**: Es opcional pero altamente recomendado para producción
4. **Rate Limits**: No bajar demasiado para evitar bloquear usuarios legítimos en NAT/coworkings

