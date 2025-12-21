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
