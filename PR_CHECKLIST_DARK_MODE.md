# PR Checklist - Dark Mode + PDP Polish + Recently Viewed

## Cambios Implementados

### 1. Dark Mode (next-themes)
- ✅ Instalado `next-themes`
- ✅ Creado `ThemeProvider` wrapper
- ✅ Integrado en `Providers` (envuelve `ToastProvider`)
- ✅ Toggle en header (desktop + mobile)
- ✅ CSS dark mode variables y overrides
- ✅ `suppressHydrationWarning` en `<html>`
- ✅ Evita hydration mismatch con `mounted` state

### 2. PDP Polish (Product Detail Page)
- ✅ Título más bold (font-bold, text-2xl/3xl)
- ✅ Precio más destacado (text-4xl/5xl)
- ✅ 4 acordeones (details/summary nativos):
  - Envíos y devoluciones
  - Pagos y facturación
  - Garantía
  - Soporte
- ✅ Dark mode styles en todos los componentes PDP
- ✅ TrustBadgesPDP mejorado para dark mode
- ✅ PdpStickyCTA mejorado para dark mode

### 3. Recently Viewed (Ya existía, mejorado)
- ✅ Ya existe `RecentlyViewedTracker` y `RecentlyViewed`
- ✅ Mejoras: dark mode styles
- ✅ Cards con hover mejorado
- ✅ Badges de stock con dark mode

## Validaciones Técnicas
- [x] `pnpm lint` - OK (solo warnings preexistentes)
- [x] `pnpm typecheck` - OK
- [x] `pnpm build` - OK (compilación exitosa)

## Smoke Test Checklist

### Dark Mode
- [ ] `/` - Toggle funciona, tema persiste al recargar
- [ ] `/tienda` - Cards se ven bien en dark mode
- [ ] `/buscar` - Búsqueda funciona en dark mode
- [ ] `/destacados` - Lista se ve bien en dark mode
- [ ] PDP - Tema persiste, todos los elementos visibles
- [ ] `/checkout` - No se rompe visualmente en dark mode
- [ ] `/auth/confirm` - Se ve bien en dark mode

### PDP
- [ ] Título y precio destacados visibles
- [ ] 4 acordeones funcionan (abrir/cerrar)
- [ ] TrustBadgesPDP visibles
- [ ] Sticky CTA en mobile funciona
- [ ] Related products se ven bien
- [ ] Recently Viewed se ve bien

### Recently Viewed
- [ ] Registrar producto en PDP
- [ ] Aparece en "Vistos recientemente"
- [ ] Click funciona
- [ ] Dark mode styles aplicados

## Micro Ajustes Aplicados
- [x] Dark mode CSS variables en `.dark { ... }`
- [x] Toggle con mounted state para evitar hydration
- [x] Acordeones accesibles (details/summary nativos)
- [x] Dark mode styles en todos los componentes relevantes

## Notas Importantes
- **NO se modificó lógica de negocio** (stores Zustand, queries Supabase, Stripe/webhook, Skydropx)
- **NO se movieron/eliminaron Providers** (ToastProvider intacto, ThemeProvider solo envuelve)
- **NO se tocó configuración peligrosa** (tailwind content intacto)
- Solo cambios UI/UX y dark mode

## Archivos Modificados/Creados

### Modificados
- `package.json` - Agregado `next-themes`
- `src/app/providers.tsx` - Agregado `ThemeProvider`
- `src/app/globals.css` - Dark mode variables y overrides
- `src/app/layout.tsx` - Dark mode toggle, body classes
- `src/components/header/HeaderWithScrollEffect.tsx` - Dark mode styles
- `src/app/catalogo/[section]/[slug]/page.tsx` - PDP polish + dark mode
- `src/components/pdp/TrustBadgesPDP.tsx` - Dark mode styles
- `src/components/pdp/PdpStickyCTA.client.tsx` - Dark mode styles
- `src/components/catalog/RecentlyViewed.client.tsx` - Dark mode styles

### Creados
- `src/components/providers/ThemeProvider.tsx` - Wrapper para next-themes
- `src/components/header/DarkModeToggle.tsx` - Toggle component

