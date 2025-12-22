<<<<<<< HEAD
## 🎯 Objetivo

Mejorar el Admin de Pedidos para usar y mostrar las columnas reales de `public.orders` (shipping_* y payment_*) en lugar de solo metadata, y agregar visualización de `variant_detail` en los items del pedido.

## 📋 Cambios realizados

### 1. Actualización de tipos y queries
- ✅ Actualizado `OrderItem` type para incluir `variant_detail: Record<string, unknown> | null`
- ✅ Actualizadas queries en `getOrderWithItemsAdmin` y `getOrderWithItems` para incluir `variant_detail` en el select
- ✅ Mapeo de `variant_detail` en los items retornados

### 2. Mejoras en lista de pedidos (`/admin/pedidos`)
- ✅ Mejorada visualización de envío: muestra `shipping_tracking_number` cuando existe
- ✅ Mejorado manejo de `shipping_provider === null` para mostrar "Recoger en tienda"
- ✅ La tabla ya mostraba `payment_method`, `payment_status`, `shipping_status` correctamente

### 3. Mejoras en detalle de pedido (`/admin/pedidos/[id]`)
- ✅ **Sección "Pago"** mejorada:
  - Muestra `payment_method` y `payment_status`
  - Agrega `payment_provider` y `payment_id` (desde metadata) si existen
- ✅ **Sección "Envío"** mejorada:
  - Ya mostraba `shipping_status`, `shipping_provider`, `shipping_service_name`
  - Ya mostraba `shipping_price_cents`, `shipping_eta_min_days/max_days`
  - Ya mostraba `shipping_tracking_number` y `shipping_label_url`
- ✅ **Sección "Notas internas"**:
  - Muestra `admin_notes` si existe (solo lectura)
  - Incluye componente `AdminNotesClient` para editar
- ✅ **Items del pedido**:
  - Muestra `variant_detail` cuando existe
  - Usa `variantDetailFromJSON` para formatear colores (ej: "Color: Azul · Preferencia: 2 azules y 1 rojo")
  - Fallback a formato simple key:value para JSON desconocido

### 4. Badge VERCEL_ENV
- ✅ Agregado badge discreto en el header global (`layout.tsx`)
- ✅ Muestra "PROD" (verde) si `VERCEL_ENV === "production"`
- ✅ Muestra "PREVIEW" (ámbar) si `VERCEL_ENV === "preview"`
- ✅ Muestra "LOCAL" (gris) si está definido pero no es production/preview
- ✅ Se oculta si `VERCEL_ENV` no está definido

## ✅ Validaciones

- ✅ `pnpm typecheck` - Sin errores
- ✅ `pnpm build` - Compilación exitosa
- ✅ `pnpm lint` - Solo warnings preexistentes (no relacionados con estos cambios)

## 🧪 Testing

- [ ] Verificar que en producción el Admin lista muestre pago/envío con datos reales cuando existan
- [ ] Verificar que en detalle aparezcan secciones Pago y Envío con columnas shipping_* y payment_*
- [ ] Verificar que `variant_detail` aparezca en items cuando existe (y no rompa cuando es NULL)
- [ ] Verificar que se vea badge PREVIEW/PROD para no confundir dominio preview vs prod

## 📝 Notas

- No se cambió lógica de negocio, solo visualización/lectura
- Los tipos TypeScript están actualizados
- Compatible con SSR (no rompe server components)
- Reutiliza helpers existentes (`formatMXNFromCents`, `variantDetailFromJSON`, etc.)
=======
## Objetivo

Implementar selector de color para productos con variedad (ej: MODULO DE LLAVE) sin crear variantes en DB. El color seleccionado se guarda en `order_items.variant_detail` como JSONB.

## Cambios

### Nuevos archivos
- `src/lib/products/colors.ts`: Helpers para identificar productos con colores y formatear variant_detail
- `src/components/pdp/ColorSelector.tsx`: Componente de selector de color con chips y opción "Surtido (mix)"
- `src/lib/products/parseVariantDetail.ts`: Utilidades para convertir variant_detail entre string y JSON
- `ops/sql/add_variant_detail_to_order_items.sql`: Script SQL para agregar columna `variant_detail` (JSONB) a `order_items`

### Archivos modificados
- `src/components/product/ProductActions.client.tsx`: Integración de ColorSelector, validación de color requerido, combinación de variant_detail
- `src/app/api/checkout/create-order/route.ts`: Guardado de variant_detail como JSON en order_items
- `src/app/api/checkout/save-order/route.ts`: Guardado de variant_detail como JSON en order_items (Zod schema actualizado)
- `src/app/checkout/pago/PagoClient.tsx`: Envío de variant_detail en payload de orden
- `src/app/carrito/page.tsx`: Visualización de variant_detail en carrito
- `src/app/cuenta/pedidos/ClientPage.tsx`: Visualización de variant_detail desde JSON en pedidos

## Características

- ✅ Selector de color con chips para colores disponibles
- ✅ Opción "Surtido (mix)" con input opcional para preferencias
- ✅ Aviso de disponibilidad de colores
- ✅ Validación: color obligatorio si el producto tiene colores (default: "Surtido (mix)" preseleccionado)
- ✅ Persistencia: variant_detail guardado como JSON en `order_items.variant_detail`
- ✅ Visualización: color mostrado en PDP, carrito, checkout y pedidos
- ✅ Compatibilidad: funciona junto con otras variantes (arcos, brackets, etc.)

## Estructura de datos

- **En carrito**: `variant_detail` como string (ej: "Color: Azul" o "Color: Surtido · Preferencia: 2 azules y 1 rojo")
- **En order_items**: `variant_detail` como JSONB (ej: `{"color": "Azul"}` o `{"color": "Surtido", "notes": "2 azules y 1 rojo"}`)

## Productos configurados

- `modulo-de-llave` (MODULO DE LLAVE) - 10 colores disponibles

## ⚠️ Paso obligatorio post-merge

**Ejecutar en Supabase SQL Editor:**

```sql
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS variant_detail JSONB;

COMMENT ON COLUMN public.order_items.variant_detail IS 
  'Detalles de variantes del producto (ej: {"color": "Azul"} o {"color": "Surtido", "notes": "2 azules y 1 rojo"})';
```

El script completo está en: `ops/sql/add_variant_detail_to_order_items.sql`

## Validaciones

- ✅ `pnpm typecheck`: OK
- ✅ `pnpm build`: OK
- ✅ `pnpm lint`: Solo warnings preexistentes (no relacionados)
- ⚠️ `pnpm test`: Algunos tests fallidos (preexistentes, no relacionados con este PR)

## Checklist

- [x] Código compila sin errores
- [x] Build exitoso
- [x] Lint sin errores nuevos
- [x] Selector de color funcional
- [x] Persistencia en order_items implementada
- [x] Visualización en carrito/checkout/pedidos
- [x] Script SQL incluido
- [ ] Script SQL ejecutado en Supabase (post-merge)
>>>>>>> origin/main
