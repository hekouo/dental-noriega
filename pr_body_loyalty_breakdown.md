## Show Loyalty Points Per Order

### Resumen de cambios

Muestra el desglose de puntos de lealtad por pedido en `/cuenta/pedidos`, tanto en la lista como en el detalle.

### Campos utilizados

Los campos se guardan en `orders.metadata` cuando la orden está en estado `paid`:

- `metadata.loyalty_points_earned` → Puntos ganados en ese pedido (número entero)
- `metadata.loyalty_points_spent` → Puntos gastados en el descuento (número entero, 0 si no aplica)

Estos campos son guardados por el helper centralizado `processLoyaltyForOrder` que ya está integrado en:
- `src/app/api/checkout/save-order/route.ts`
- `src/app/api/checkout/update-order-status/route.ts`
- `src/app/api/stripe/webhook/route.ts`

### Cambios realizados

#### 1. Tipos actualizados

**Archivo:** `src/lib/supabase/orders.server.ts`

- Añadidos `loyalty_points_earned`, `loyalty_points_spent`, y `loyalty_points_balance_after` al tipo `OrderSummary.metadata`
- Estos campos se leen correctamente del JSONB de Supabase

#### 2. Panel de detalle de pedido

**Archivo:** `src/app/cuenta/pedidos/page.tsx`

- Nueva sección "Puntos de lealtad" en el panel de detalle
- Muestra:
  - **Puntos ganados:** +XX (en verde)
  - **Puntos usados:** -YY (en naranja, solo si se usó descuento)
  - **Puntos netos:** ZZ (ganados - gastados)
- Solo se muestra si:
  - La orden está en estado `paid`
  - Hay datos válidos de puntos (no null/undefined)

#### 3. Resumen en lista de pedidos

**Archivo:** `src/app/cuenta/pedidos/page.tsx`

- Línea pequeña debajo del método de envío mostrando:
  - `Puntos: +90` (si solo ganó puntos)
  - `Puntos: +90 / -50` (si ganó y gastó puntos)
- Solo se muestra si:
  - La orden está en estado `paid`
  - Hay datos válidos de puntos

### Reglas de visualización

- Solo mostrar puntos si la orden está `paid`
- Si `loyalty_points_earned` y `loyalty_points_spent` vienen `null` o `undefined`, ocultar el bloque
- Si viene `0`, no mostrar esa línea (solo mostrar si > 0)
- Los puntos netos siempre se calculan y muestran si hay al menos un valor válido

### Verificación técnica

- ✅ `pnpm lint` - Sin errores (solo warnings preexistentes)
- ✅ `pnpm typecheck` - Sin errores
- ✅ `pnpm build` - Exitoso

### Cómo probar

1. **Hacer compras de prueba:**
   - Compra sin usar puntos: verificar que se muestre "Puntos ganados: +XX"
   - Compra usando puntos: verificar que se muestre "Puntos ganados: +XX", "Puntos usados: -1000", "Puntos netos: YY"

2. **Verificar en `/cuenta/pedidos`:**
   - En la lista: verificar que aparezca el resumen de puntos (ej: "Puntos: +90")
   - En el detalle: verificar que aparezca la sección completa de puntos con desglose

3. **Verificar casos edge:**
   - Pedidos pendientes: no deben mostrar puntos
   - Pedidos sin datos de puntos: no deben mostrar la sección

### Notas técnicas

- Los campos se guardan automáticamente por `processLoyaltyForOrder` cuando la orden pasa a `paid`
- La idempotencia está garantizada por el helper (no duplica puntos si se reintenta)
- El diseño mantiene consistencia con el resto de la UI (Tailwind, tipografía, espaciados)

