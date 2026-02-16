# PR-H9: Brand kit y social preview (OpenGraph)

## Objetivo
Configurar brand kit y social preview (OpenGraph/Twitter) usando assets en `/public/brand`, sin tocar checkout/pagos/envíos/admin/APIs ni agregar librerías.

## 1) Assets en /public/brand (verificación)
- `ddn-logo-horizontal.png` ✓
- `ddn-mark.png` ✓
- `ddn-seal.png` ✓
- `icon-192.png`, `icon-512.png` ✓
- `apple-touch-icon.png` ✓
- `favicon.ico` ✓

## 2) Cambios realizados
- **src/app/layout.tsx:** `metadata.openGraph.images` y `metadata.twitter.images` actualizados para usar `/brand/ddn-seal.png` como imagen social (sello para compartir). Se mantienen `metadataBase`, `title`, `description` y `locale` coherentes con DDN. Dimensiones 630x630 y `alt: SITE.name`.
- No se añadieron `opengraph-image.tsx` ni `twitter-image.tsx`; se usa metadata estática con `/public/brand` como indicado.

## 3) Opengraph-image / twitter-image
- No existen en el proyecto; se prefiere metadata estática con `/public/brand`. Sin cambios.

## QA
- [ ] **pnpm -s verify** → exit 0.
- [ ] Los meta tags `og:image` y `twitter:image` apuntan a la URL absoluta de `/brand/ddn-seal.png` (resuelta vía `metadataBase`).
- [ ] Build no se rompe; no hay rutas `/opengraph-image` dinámicas (no aplica).

## Confirmación
**No se tocó:** checkout, pagos, envíos, admin, APIs. Solo metadata en `layout.tsx` y doc.
