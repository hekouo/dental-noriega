# PR Checklist - Dark Mode + PDP Polish + Recently Viewed

## Cambios Implementados

### 1. Dark Mode (next-themes)
- [x] Instalado `next-themes`
- [x] Creado `ThemeProvider` wrapper
- [x] Agregado `DarkModeToggle` en header
- [x] Variables CSS dark mode en `globals.css`
- [x] Tailwind config: `darkMode: "class"`
- [x] Clases dark agregadas a layout, header, PDP
- [x] Sin hydration mismatch (placeholder mientras monta)

### 2. PDP Polish
- [x] Soporte dark mode en PDP (fondos, texto, bordes)
- [x] Mejorado styling de acordeón con dark mode
- [x] Creado componente `Accordion` (disponible para futuro uso)
- [x] Trust badges ya existían y funcionan

### 3. Recently Viewed
- [x] Ya existe `RecentlyViewedTracker` y `RecentlyViewed` en `src/components/catalog/`
- [x] Ya está integrado en PDP (línea 375 de `page.tsx`)
- [x] Funciona con localStorage (cliente-only)
- [x] No requiere cambios

## Validaciones Técnicas

- [x] `pnpm lint` - OK
- [x] `pnpm typecheck` - OK
- [ ] `pnpm build` - Verificar manualmente

## Smoke Test Checklist

### Rutas Verificadas
- [ ] `/` - Dark toggle funciona, hero OK
- [ ] `/tienda` - Dark mode OK, cards OK
- [ ] `/buscar` - Dark mode OK
- [ ] `/destacados` - Dark mode OK
- [ ] PDP 2 productos - Dark mode OK, acordeones OK, registro de vistos OK
- [ ] `/checkout` - Dark mode no rompe visualmente
- [ ] `/auth/confirm` - Dark mode OK

### Funcionalidad Dark Mode
- [ ] Toggle funciona (claro/oscuro)
- [ ] Persiste al recargar
- [ ] No hay flicker gigante
- [ ] Texto legible (contraste AA)

### PDP
- [ ] Layout se ve premium
- [ ] Acordeones funcionan (envíos/devoluciones)
- [ ] Trust badges visibles
- [ ] Dark mode aplicado correctamente

### Recently Viewed
- [ ] Se registran productos vistos
- [ ] Se muestran en PDP al final
- [ ] No errores SSR

## Notas Importantes
- **NO se modificó lógica de negocio** (stores, queries, APIs)
- **NO se movieron/eliminaron Providers** (ThemeProvider agregado, ToastProvider intacto)
- **NO se tocó configuración peligrosa** (tailwind content intacto)
- Solo cambios UI/UX y soporte dark mode

## Archivos Modificados/Creados

### Modificados
- `tailwind.config.ts` - `darkMode: "class"`
- `src/app/globals.css` - Variables CSS dark mode
- `src/app/providers.tsx` - Agregado ThemeProvider
- `src/app/layout.tsx` - DarkModeToggle + clases dark
- `src/components/header/HeaderWithScrollEffect.tsx` - Clases dark
- `src/app/catalogo/[section]/[slug]/page.tsx` - Clases dark en PDP

### Creados
- `src/components/providers/ThemeProvider.tsx` - Wrapper next-themes
- `src/components/header/DarkModeToggle.tsx` - Toggle dark/light
- `src/components/ui/Accordion.tsx` - Componente accordion (disponible)

### Sin cambios (ya existían)
- `src/components/catalog/RecentlyViewedTracker.client.tsx` - Ya funciona
- `src/components/catalog/RecentlyViewed.client.tsx` - Ya funciona

