# Checklist de Configuración: Supabase Auth Dashboard

Este documento describe la configuración actual de Supabase Auth para Depósito Dental Noriega, enfocada en **Rate Limits** y **Attack Protection**.

**Snapshot**: Enero 2026  
**Plan Supabase**: FREE  
**Dominio producción**: `https://ddnshop.mx`

---

## 📊 Rate Limits (Auth)

Los rate limits se configuran en **Supabase Dashboard > Authentication > Rate Limits**.

### ⚠️ IMPORTANTE: Contexto del Proyecto

- **NAT (Network Address Translation)**: Clínicas y coworkings pueden compartir IP pública
- **Uso legítimo**: Múltiples usuarios desde la misma IP es normal
- **Plan FREE**: Limitaciones más estrictas que Pro

**Recomendación**: No bajar demasiado los límites para evitar bloquear usuarios legítimos.

### Configuración Recomendada Actual

| Campo | Valor Actual | Notas |
|-------|--------------|-------|
| **Sending emails** | `2 emails/hour` | ⚠️ Solo cambia con SMTP propio (Resend). Con SMTP de Supabase, este límite es fijo. |
| **Token refreshes** | `150 requests / 5 minutes` | Para mantener sesiones activas. Suficiente para uso normal. |
| **Token verifications** | `30 requests / 5 minutes` | Para verificar tokens (reset password, confirm signup, etc.). |
| **Sign-ups & sign-ins** | `30 requests / 5 minutes` | Combinado: registros + inicios de sesión. |
| **SMS** | `0` (deshabilitado) | No se usa SMS en este proyecto. |

### Explicación Detallada

#### Sending emails (2 emails/hour)

- **Qué controla**: Cantidad de emails que Supabase puede enviar por hora desde su SMTP
- **Limitación**: Con SMTP de Supabase (plan FREE), este valor **NO se puede cambiar**. Solo se puede ajustar si usas SMTP propio (Resend, SendGrid, etc.)
- **Impacto**: Si un usuario solicita múltiples resets de contraseña, puede llegar al límite
- **Mitigación**: 
  - Frontend ya implementa rate limiting (60s cooldown en `/forgot-password`)
  - Considerar SMTP propio (Resend) si se necesita más volumen

#### Token refreshes (150/5 min)

- **Qué controla**: Requests para refrescar tokens de sesión (mantener usuario logueado)
- **Uso típico**: Automático por el cliente de Supabase cuando la sesión está por expirar
- **Recomendación**: 150 es suficiente para uso normal. No reducir demasiado.

#### Token verifications (30/5 min)

- **Qué controla**: Verificación de tokens (reset password, confirm signup, magic links, etc.)
- **Uso típico**: Cuando el usuario hace clic en links de email
- **Recomendación**: 30 es razonable. Si hay muchos usuarios nuevos, considerar aumentar a 60.

#### Sign-ups & sign-ins (30/5 min)

- **Qué controla**: Combinado: registros nuevos + inicios de sesión
- **Uso típico**: Usuarios creando cuenta o iniciando sesión
- **Recomendación**: 30 es suficiente para uso normal. No reducir demasiado para evitar bloquear clínicas/coworkings.

#### SMS (0 - deshabilitado)

- **Qué controla**: Envío de SMS para autenticación
- **Estado**: No se usa en este proyecto
- **Recomendación**: Mantener en 0

### ⚠️ Nota sobre NAT y Clínicas/Coworkings

Si reduces demasiado los límites (ej: 5 sign-ups/5 min), puedes bloquear usuarios legítimos que comparten IP pública:

- **Clínicas**: Múltiples dentistas desde la misma IP
- **Coworkings**: Múltiples profesionales desde la misma red
- **NAT**: Varios usuarios domésticos detrás del mismo router

**Recomendación**: Mantener límites razonables (30+ para sign-ups/sign-ins) y usar Captcha para prevenir abuso.

---

## 🛡️ Attack Protection

### Captcha Protection

**Estado actual**: No configurado (opcional)

**Recomendación**: Activar Captcha para prevenir abuso automatizado.

#### Proveedores Soportados

Supabase soporta estos proveedores de Captcha:

1. **hCaptcha** (recomendado)
   - Plan FREE disponible
   - Más privado que reCAPTCHA
   - [Documentación Supabase](https://supabase.com/docs/guides/auth/auth-captcha#hcaptcha)

2. **Cloudflare Turnstile**
   - Plan FREE disponible
   - Sin tracking de usuarios
   - [Documentación Supabase](https://supabase.com/docs/guides/auth/auth-captcha#cloudflare-turnstile)

3. **Google reCAPTCHA v3**
   - Requiere cuenta de Google
   - Tracking de usuarios
   - [Documentación Supabase](https://supabase.com/docs/guides/auth/auth-captcha#google-recaptcha-v3)

#### Cómo Configurar

1. Ve a **Supabase Dashboard > Authentication > Providers > Email**
2. Busca la sección **"Captcha"**
3. Selecciona el proveedor (hCaptcha o Turnstile recomendados)
4. Ingresa las credenciales (Site Key y Secret Key)
5. Guarda los cambios

#### Implementación en Frontend

Después de configurar en Supabase, el Captcha se aplica automáticamente en:
- Sign up
- Sign in
- Password reset (forgot password)

**Nota**: No requiere cambios en el código si usas los métodos estándar de Supabase Auth.

### Leaked Passwords Protection

**Estado actual**: No disponible (requiere plan Pro)

**Qué hace**: Verifica si la contraseña del usuario está en bases de datos de contraseñas filtradas (Have I Been Pwned, etc.)

**Recomendación**: 
- En plan FREE: No disponible
- Si se migra a Pro: Activar esta protección

**Dónde configurar**: Supabase Dashboard > Authentication > Attack Protection > Leaked Passwords

---

## ✅ Cómo Verificar que Quedó Bien (5 minutos)

### 1. Probar Sign Up (1 min)

1. Ve a `https://ddnshop.mx/cuenta` (o ruta de registro)
2. Crea una cuenta nueva con un email de prueba
3. Verifica que:
   - El email de confirmación llegue (revisar spam)
   - El link de confirmación funcione
   - Puedas iniciar sesión después de confirmar

### 2. Probar Sign In (1 min)

1. Inicia sesión con una cuenta existente
2. Verifica que:
   - La sesión se cree correctamente
   - Puedas acceder a páginas protegidas (ej: `/cuenta`)

### 3. Probar Forgot Password (1 min)

1. Ve a `https://ddnshop.mx/forgot-password`
2. Ingresa un email válido
3. Verifica que:
   - Aparezca mensaje de éxito
   - El email llegue (revisar spam)
   - El link apunte a `/auth/confirm?token_hash=...&type=recovery&next=/reset-password`

### 4. Probar Reset Password (1 min)

1. Abre el link del email de reset password
2. Verifica que:
   - Se muestre `/auth/confirm` con botón "Continuar"
   - Al hacer clic, redirija a `/reset-password` con sesión válida
   - Puedas cambiar la contraseña
   - Redirija a `/cuenta` después de cambiar

### 5. Revisar Audit Logs (1 min)

1. Ve a **Supabase Dashboard > Authentication > Logs**
2. Verifica que aparezcan los eventos:
   - Sign up
   - Sign in
   - Password reset request
   - Password reset confirm
3. Revisa si hay errores o bloqueos por rate limits

---

## 📝 Checklist Post-Deploy

Después de hacer cambios en la configuración de Auth:

- [ ] **Rate Limits verificados**:
  - [ ] Sending emails: 2/hour (o valor configurado si usas SMTP propio)
  - [ ] Token refreshes: 150/5 min
  - [ ] Token verifications: 30/5 min
  - [ ] Sign-ups & sign-ins: 30/5 min
  - [ ] SMS: 0 (deshabilitado)

- [ ] **Attack Protection**:
  - [ ] Captcha configurado (opcional pero recomendado)
  - [ ] Leaked passwords: N/A (requiere Pro)

- [ ] **Pruebas E2E completadas**:
  - [ ] Sign up funciona
  - [ ] Sign in funciona
  - [ ] Forgot password funciona
  - [ ] Reset password funciona

- [ ] **Audit Logs revisados**:
  - [ ] No hay errores inesperados
  - [ ] Rate limits no están bloqueando usuarios legítimos

---

## 🔗 Referencias

- [Supabase Auth Rate Limits](https://supabase.com/docs/guides/auth/auth-rate-limits)
- [Supabase Auth Captcha](https://supabase.com/docs/guides/auth/auth-captcha)
- [Supabase Auth Attack Protection](https://supabase.com/docs/guides/auth/auth-attack-protection)
- [Reset Password Setup](./RESET_PASSWORD_SETUP.md)

---

**Última actualización**: Enero 2026  
**Mantenido por**: Equipo de desarrollo DDN

