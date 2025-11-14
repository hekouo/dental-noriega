## Fix: Relajar idempotencia de Stripe PaymentIntent

### Problema
- Error de Stripe: "Keys for idempotent requests can only be used with the same parameters they were first used with"
- La idempotencyKey `pi_${order_id}` causaba errores cuando cambiaba el `amount`
- Esto ocurre cuando el usuario cambia método de envío, aplica cupón, etc.

### Solución
- Incluir `amount` en la idempotencyKey: `pi_${order_id}_${amount}`
- Si la misma orden se intenta con el mismo amount → idempotente
- Si cambia el amount → nueva key, no da error

### Mejoras adicionales
- Manejo mejorado de errores de Stripe con logs detallados
- Logs incluyen: type, message, code, param, requestId, order_id, amount, total_cents_from_body
- Logs controlados por `NEXT_PUBLIC_CHECKOUT_DEBUG`

### Cambios
- `create-payment-intent/route.ts`: IdempotencyKey incluye amount, mejor manejo de errores

### QA
- ✅ `pnpm typecheck`: PASS
- ✅ `pnpm build`: PASS

