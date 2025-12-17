# Idempotencia de Stripe Webhook

## Descripción

Este sistema implementa idempotencia real para los webhooks de Stripe usando la tabla `stripe_webhook_events`. Cada evento de Stripe se registra una sola vez usando `event.id` como clave primaria, evitando procesamiento duplicado por reintentos o "Resend event" de Stripe.

## Instalación

1. Ejecuta el script SQL en Supabase:
   ```sql
   -- Ejecutar en Supabase SQL Editor
   -- Ver archivo: ops/sql/stripe_webhook_events.sql
   ```

2. Verifica que la tabla se creó correctamente:
   ```sql
   SELECT * FROM public.stripe_webhook_events LIMIT 5;
   ```

## Cómo probar idempotencia

### Método 1: Stripe Dashboard → Resend Event

1. Ve a **Stripe Dashboard** → **Developers** → **Webhooks**
2. Selecciona tu endpoint de webhook
3. En la sección **Events**, busca un evento reciente (ej: `payment_intent.succeeded`)
4. Click en el evento para ver detalles
5. Click en **"Resend event"** (o "Replay event")
6. Verifica en los logs del servidor que:
   - El evento se recibe
   - Se intenta insertar en `stripe_webhook_events`
   - Si ya existe, se detecta la violación de clave primaria (código `23505`)
   - Se responde `200 OK` con `{ received: true, idempotent: true }`
   - **NO se procesa el evento nuevamente** (no se actualiza la orden)

### Método 2: Verificar en base de datos

Después de recibir un evento:

```sql
-- Ver eventos registrados
SELECT 
  id, 
  type, 
  order_id, 
  payment_intent_id, 
  charge_id,
  processed_at
FROM public.stripe_webhook_events
ORDER BY processed_at DESC
LIMIT 10;
```

Si intentas reenviar el mismo evento, deberías ver:
- El mismo `id` (event.id de Stripe) aparece solo UNA vez
- Si intentas insertar manualmente el mismo `id`, obtendrás error de clave duplicada

### Método 3: Logs del servidor

En desarrollo (`NODE_ENV=development`), busca en los logs:

```
[webhook] Evento ya procesado (idempotencia): evt_xxx
```

## Eventos manejados

- **`payment_intent.succeeded`**: Actualiza orden a `paid`, guarda `stripe_payment_intent_id` en metadata
- **`payment_intent.payment_failed`**: Actualiza orden a `failed`, guarda razón de fallo en metadata
- **`charge.refunded`**: Actualiza orden a `refunded`, guarda información de reembolso en metadata

## Protección de estados finales

El sistema protege contra degradación accidental de estados:

- **`refunded`** → No puede cambiar a `paid` o `pending`
- **`paid`** → No puede degradar a `pending` (pero sí puede cambiar a `refunded`)

Si se intenta degradar un estado final, el webhook:
- Registra un warning en logs (solo en desarrollo)
- No actualiza la orden
- Responde `200 OK` para evitar reintentos

## Troubleshooting

### El evento no se registra

1. Verifica que la tabla `stripe_webhook_events` existe:
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name = 'stripe_webhook_events'
   );
   ```

2. Verifica permisos: La tabla debe ser accesible con `SUPABASE_SERVICE_ROLE_KEY`

### El evento se procesa dos veces

1. Verifica que la tabla tiene PRIMARY KEY en `id`:
   ```sql
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'stripe_webhook_events'
   AND constraint_type = 'PRIMARY KEY';
   ```

2. Revisa los logs para ver si hay errores al insertar en `stripe_webhook_events`

### El webhook falla con error 500

1. Revisa los logs del servidor para ver el error específico
2. Verifica que `STRIPE_WEBHOOK_SECRET` está configurado correctamente
3. Verifica que la firma del webhook es válida (Stripe envía `stripe-signature` header)

## Notas

- La idempotencia se basa en `event.id` de Stripe, que es único por evento
- Si un evento falla parcialmente (ej: se registra pero falla actualizar orden), el reintento detectará que ya fue registrado y no lo procesará nuevamente
- Para forzar reprocesamiento de un evento, necesitarías eliminar manualmente el registro de `stripe_webhook_events` (no recomendado en producción)

