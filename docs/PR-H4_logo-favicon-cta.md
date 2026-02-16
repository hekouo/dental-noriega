# PR-H4: Logo + favicon + CTA final

## Objetivo

- Apuntar logo, favicon e iconos a los nuevos assets en `/public/brand`.
- Actualizar Header con Logo (desktop: horizontal, mobile: mark).
- Actualizar Hero con Logo desde brand.
- Favicon e iconos de PWA desde `/brand/`.
- CTA final editorial: /tienda, /facturacion, WhatsApp, QR placeholder.

## Cambios

### A) Assets verificados

Existen en `/public/brand`:
- `ddn-logo-horizontal.png`
- `ddn-mark.png`
- `ddn-seal.png`
- `favicon.ico`
- `icon-192.png`
- `icon-512.png`
- `apple-touch-icon.png`

### B) Logo.tsx

| Archivo | Cambio |
|--------|--------|
| `src/components/common/Logo.tsx` | Renderiza imágenes desde `/brand/ddn-logo-horizontal.png` y `/brand/ddn-mark.png`. variant: horizontal | mark, size: sm (24px) \| md (28px) \| lg (40px). Usa `next/image`. |

### C) Header

| Archivo | Cambio |
|--------|--------|
| `src/app/layout.tsx` | Reemplaza BrandMark por Logo: mobile `<Logo variant="mark" size="sm" />`, desktop `<Logo variant="horizontal" size="md" />`. Link al home intacto. |

### D) Hero

| Archivo | Cambio |
|--------|--------|
| `src/components/home/HeroIntro.tsx` | Ya usa `<Logo variant="horizontal" size="lg" />`. Logo ahora renderiza imagen desde /brand. |

### E) Favicon / icons

| Archivo | Cambio |
|--------|--------|
| `src/app/layout.tsx` | metadata.icons: icon: /brand/favicon.ico, apple: /brand/apple-touch-icon.png |
| `public/manifest.webmanifest` | icons: /brand/icon-192.png, /brand/icon-512.png |

### F) FinalCTA

| Archivo | Cambio |
|--------|--------|
| `src/components/home/FinalCTA.tsx` | CTA editorial: botones /tienda, /facturacion, WhatsApp. QR placeholder visual (sin libs). |

### G) Integración en Home

| Archivo | Cambio |
|--------|--------|
| `src/app/page.tsx` | Tras CTA Section previa: AnimatedSeparator + FinalCTA. Reemplaza bloque CTA anterior. |

## Archivos tocados / creados

- `src/components/common/Logo.tsx` (actualizado)
- `src/components/home/FinalCTA.tsx` (nuevo)
- `src/app/layout.tsx` (Logo en header, metadata icons)
- `src/app/page.tsx` (FinalCTA integrado)
- `public/manifest.webmanifest` (rutas icons)
- `docs/PR-H4_logo-favicon-cta.md` (este archivo)

**No se tocó:** checkout, pagos, admin, shipping, Stripe, Supabase, rutas API.  
**No se borró:** archivos existentes en /public (favicon.ico, icon-192, icon-512 siguen en root; solo se apunta metadata/manifest a /brand).

## QA

- **Header:** logo ok desktop (horizontal) y mobile (mark).
- **Hero:** logo horizontal size lg visible.
- **Favicon:** hard refresh para ver /brand/favicon.ico.
- **Manifest:** PWA icons apuntan a /brand/icon-192.png y icon-512.png.
- **pnpm -s verify:** pasa.

## Branch / Commit / PR

- **Branch:** feat/home-pr-h4-logo-favicon-cta
- **Commit:** feat(brand): pr-h4 logo + favicon + final cta
- **PR:** Base main, title **PR-H4: Logo + favicon + CTA final**, body: este doc.
