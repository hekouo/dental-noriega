## Fix: Show Shipping Cost and Refresh Loyalty Summary

### Problemas corregidos

1. **Precio de envío no se mostraba**: Aunque el código ya estaba preparado para mostrar el precio, no se estaba guardando correctamente en la base de datos.
2. **Panel de puntos desactualizado**: Los puntos de lealtad solo se cargaban una vez al montar el componente, no se refrescaban al buscar pedidos.

### Cambios realizados

#### 1. Precio de envío

**Campo utilizado:**
- `metadata.shipping_cost_cents` (en centavos) dentro del campo `metadata` de la tabla `orders`

**Cómo se llena:**
- En `create-order`: Se recibe `shippingCostCents` desde el frontend y se guarda en `metadata.shipping_cost_cents`
- En `save-order`: Se preserva el `shipping_cost_cents` existente del metadata de la orden si no viene en el payload

**Dónde se muestra:**
- En la lista de pedidos (`/cuenta/pedidos`), debajo del método de envío:
  - `Envío estándar · $20.00` (si shipping_cost_cents > 0)
  - `Envío express · $30.00` (si shipping_cost_cents > 0)
  - `Recoger en tienda` (sin precio si shipping_cost_cents es 0 o undefined)

**Archivos modificados:**
- `src/app/checkout/pago/PagoClient.tsx`: Añadido `shippingCostCents` al payload de `create-order`
- `src/app/api/checkout/create-order/route.ts`: Acepta y guarda `shippingCostCents` en metadata
- `src/app/api/checkout/save-order/route.ts`: Preserva `shipping_cost_cents` del metadata existente
- `src/lib/supabase/orders.server.ts`: Añadidos logs de debugging para inspeccionar shipping cost
- `src/app/cuenta/pedidos/page.tsx`: Renderiza el precio junto con el método de envío

#### 2. Actualización de puntos de lealtad

**Cómo se actualiza ahora:**
- Al pulsar "Buscar" en `/cuenta/pedidos`, se hacen **dos fetch en paralelo**:
  - `/api/account/orders` - Para obtener las órdenes
  - `/api/account/loyalty?email=...` - Para obtener los puntos actualizados
- Se eliminó el `useEffect` que cargaba puntos solo cuando cambiaba el email
- Ahora los puntos se refrescan cada vez que el usuario busca pedidos

**Archivos modificados:**
- `src/app/cuenta/pedidos/page.tsx`: 
  - Modificado `handleSubmit` para cargar puntos en paralelo con las órdenes
  - Eliminado `useEffect` de loyalty points (ya no necesario)

### Verificación

- ✅ `pnpm lint` - Sin errores (solo warnings preexistentes)
- ✅ `pnpm typecheck` - Sin errores
- ✅ `pnpm build` - Exitoso

### Comportamiento esperado

**Precio de envío:**
- En pedidos con envío pagado (standard/express), se muestra: `Envío estándar · $20.00`
- En pedidos "Recoger en tienda", solo se muestra: `Recoger en tienda` (sin precio)

**Puntos de lealtad:**
- Al buscar pedidos con un email, el panel de puntos muestra el acumulado actualizado inmediatamente
- Incluye puntos de pedidos recién pagados sin necesidad de hacer otra compra

### Notas técnicas

- El shipping cost se calcula en el frontend basado en CP y peso, y se pasa al backend
- El backend preserva el shipping cost existente si la orden ya existe
- Los logs de debugging solo se imprimen en `NODE_ENV === "development"`

