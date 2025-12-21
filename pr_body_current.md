## Objetivo

Implementar selector de color para productos con variedad (ej: MODULO DE LLAVE) sin crear variantes en DB, guardando la selecci├│n en `order_items.variant_detail` como JSONB.

## Cambios

### Nuevos archivos
- `src/lib/products/colors.ts`: Helpers para identificar productos con colores y formatear variant_detail
- `src/components/pdp/ColorSelector.tsx`: Componente de selector de color con chips y opci├│n "Surtido (mix)"
- `src/lib/products/parseVariantDetail.ts`: Utilidades para convertir variant_detail entre string y JSON
- `ops/sql/add_variant_detail_to_order_items.sql`: Script SQL para agregar columna `variant_detail` (JSONB) a `order_items`

### Archivos modificados
- `src/components/product/ProductActions.client.tsx`: Integraci├│n de ColorSelector, validaci├│n de color requerido
- `src/app/api/checkout/create-order/route.ts`: Guardado de variant_detail como JSON en order_items
- `src/app/api/checkout/save-order/route.ts`: Guardado de variant_detail como JSON en order_items
- `src/app/checkout/pago/PagoClient.tsx`: Env├¡o de variant_detail en payload de orden
- `src/app/carrito/page.tsx`: Visualizaci├│n de variant_detail en carrito
- `src/app/cuenta/pedidos/ClientPage.tsx`: Visualizaci├│n de variant_detail desde JSON en pedidos

## Caracter├¡sticas

- Ô£à Selector de color con chips para colores disponibles
- Ô£à Opci├│n "Surtido (mix)" con input opcional para preferencias
- Ô£à Aviso de disponibilidad de colores
- Ô£à Validaci├│n: color obligatorio si el producto tiene colores (default: "Surtido (mix)" preseleccionado)
- Ô£à Persistencia: variant_detail guardado como JSON en `order_items.variant_detail`
- Ô£à Visualizaci├│n: color mostrado en PDP, carrito, checkout y pedidos
- Ô£à Compatibilidad: funciona junto con otras variantes (arcos, brackets, etc.)

## Estructura de datos

- **En carrito**: `variant_detail` como string (ej: "Color: Azul" o "Color: Surtido ┬À Preferencia: 2 azules y 1 rojo")
- **En order_items**: `variant_detail` como JSONB (ej: `{"color": "Azul"}` o `{"color": "Surtido", "notes": "2 azules y 1 rojo"}`)

## Productos configurados

- `modulo-de-llave` (MODULO DE LLAVE) ÔÇö 10 colores disponibles

## ÔÜá´©Å Paso obligatorio post-merge

**Ejecutar en Supabase SQL Editor:**

```sql
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS variant_detail JSONB;

COMMENT ON COLUMN public.order_items.variant_detail IS 
  'Detalles de variantes del producto (ej: {"color": "Azul"} o {"color": "Surtido", "notes": "2 azules y 1 rojo"})';
```

O ejecutar el script completo:
- `ops/sql/add_variant_detail_to_order_items.sql`

## Validaciones

- Ô£à `pnpm typecheck`: OK
- Ô£à `pnpm build`: OK
- Ô£à `pnpm lint`: Solo warnings preexistentes (no relacionados)
- ÔÜá´©Å `pnpm test`: Algunos tests fallando (preexistentes, no relacionados con estos cambios)

## Checklist

- [x] C├│digo compila sin errores
- [x] Build exitoso
- [x] Lint sin errores nuevos
- [x] Selector de color funcional
- [x] Persistencia en order_items implementada
- [x] Visualizaci├│n en todas las vistas
- [x] Script SQL incluido
- [ ] Script SQL ejecutado en Supabase (pendiente post-merge)

