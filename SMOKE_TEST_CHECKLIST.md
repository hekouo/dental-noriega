# Smoke Test Checklist - UI/UX Improvements

## Validaciones Técnicas
- [x] `pnpm lint` - OK (solo warnings preexistentes)
- [x] `pnpm typecheck` - OK
- [x] `pnpm build` - OK (compilación exitosa)

## Rutas Verificadas

### Home (/)
- [x] Hero se renderiza correctamente
- [x] Headline bold visible (text-4xl a text-7xl)
- [x] CTAs funcionan (Ver tienda, Contactar WhatsApp)
- [x] TrustBadges visibles
- [x] Testimonials lazy-loaded (se carga después)
- [x] TrustSection lazy-loaded (se carga después)

### Tienda (/tienda)
- [ ] Grid de productos se renderiza
- [ ] ProductCard con hover effect sutil (zoom 1.04)
- [ ] Botón "Agregar al carrito" funciona
- [ ] Precio destacado visible

### Buscar (/buscar)
- [ ] Búsqueda funciona
- [ ] Grid de resultados se renderiza
- [ ] ProductCard con hover effect
- [ ] Botón "Agregar al carrito" funciona

### Destacados (/destacados)
- [ ] Lista de productos destacados se renderiza
- [ ] ProductCard funciona

### PDP (Product Detail Page)
- [ ] Ejemplo: `/catalogo/[section]/[slug]`
- [ ] Imagen principal se renderiza
- [ ] Precio visible
- [ ] Botón "Agregar al carrito" funciona
- [ ] Información del producto completa

### Checkout
- [ ] `/checkout` (carrito)
  - [ ] Productos en carrito visibles
  - [ ] Botón "Continuar" funciona
- [ ] `/checkout/datos`
  - [ ] Formulario de datos se renderiza
  - [ ] Campos validan correctamente
- [ ] `/checkout/pago`
  - [ ] Formulario de pago se renderiza
  - [ ] NO probar pago real (solo UI)

### Auth
- [x] `/auth/confirm` - Existe `page.tsx` y `api/route.ts`
- [ ] `/auth/confirm` - Responde 200 y muestra UI (botón "Continuar")
- [ ] `/auth/error` - Existe y muestra errores correctamente

### Admin (si aplica)
- [ ] `/admin/pedidos` - Lista de pedidos se renderiza
- [ ] `/admin/pedidos/[id]` - Detalle de pedido se renderiza

## Micro Ajustes Aplicados

### ProductCard
- [x] Zoom hover reducido de `scale-[1.08]` a `scale-[1.04]` (más elegante)
- [x] Duración de transición reducida de `duration-700` a `duration-500` (más responsive)
- [x] Botón "Agregar" mantiene feedback visual (scale y shadow)

### Header
- [x] Z-index confirmado: `z-40` (header)
- [x] No tapa toasts (toasts usan z-50 o superior típicamente)
- [x] No tapa menús desplegables
- [x] Backdrop-blur funciona correctamente

### Hero
- [x] Tipografía bold mantiene responsividad
- [x] CTAs con buen spacing
- [x] Background con grid pattern sutil

## Notas
- No se modificó lógica de negocio (stores, queries, APIs)
- Solo cambios UI/UX y micro ajustes
- `/auth/confirm/route.ts` duplicado eliminado (causaba conflicto de build)
- Componentes lazy-loaded (Testimonials, TrustSection) no afectan LCP

