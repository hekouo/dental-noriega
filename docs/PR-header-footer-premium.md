# PR: Header/Footer premium pass (tap targets + legibilidad)

**Branch:** `ui/header-footer-premium`  
**Objetivo:** Pulir Header, TopBar y Footer para que se sientan premium “Heritage dental” y sean usables en mobile (tap targets ≥44px, legibilidad, sin overflow). Solo UI/layout/estilos; no se toca navegación ni lógica.

---

## Alcance

- **TopInfoBar:** Espaciado consistente (py-3 en mobile), tap targets en links (min-h-[44px] en mobile), focus-premium, iconos un poco más grandes y legibles.
- **Header/Nav:** Nav con min-w-0 para evitar overflow; BrandMark link con min-h-[44px] y focus-premium; enlaces con focus-premium y px-2; búsqueda desktop con contenedor flex-1 max-w-md min-w-0.
- **Search:** focus-premium en botón abrir/cerrar búsqueda móvil (ya aplicado en input/chips en PR anterior).
- **Toggles:** DarkModeToggle y ThemeToggle con min-w-[44px] y focus-premium.
- **Footer:** Estilo editorial heritage (bg stone, bordes stone, tipografía con jerarquía); grid 1 col mobile, 2 cols sm, 3 cols md; separadores sutiles; links con tap targets en mobile y focus-premium. Mismos links/URLs y textos; solo layout y clases.

**No se tocó:** lógica de checkout/admin/shipping/pagos/endpoints ni rutas/contratos.

---

## Archivos tocados

| Archivo | Cambios |
|---------|---------|
| `src/components/layout/TopInfoBar.tsx` | py-3 en mobile, gap-3, min-h-[44px] en filas/links, focus-premium en links, iconos w-4 h-4. |
| `src/app/layout.tsx` | Nav: min-w-0, BrandMark link min-h-[44px] + focus-premium, enlaces con focus-premium y px-2, contenedor búsqueda con flex-1 max-w-md min-w-0, gap-2 sm:gap-3. |
| `src/components/header/HeaderSearchMobile.client.tsx` | focus-premium en botón abrir y botón cerrar panel. |
| `src/components/header/DarkModeToggle.tsx` | min-w-[44px], focus-premium. |
| `src/components/theme/ThemeToggle.client.tsx` | focus-premium en ambos botones (placeholder y activo). |
| `src/components/layout/Footer.tsx` | Heritage: bg-stone-50/80, bordes stone, titulares text-stone-800 font-semibold, links stone-600 + focus-premium + tap targets en mobile; grid 1/2/3 cols; separadores entre secciones en mobile. |
| `docs/PR-header-footer-premium.md` | Este documento. |

---

## QA manual obligatorio

### Desktop (1440 y 1280)

- [ ] Header alineado; top bar legible (espaciado, sin apretar).
- [ ] Búsqueda desktop visible y usable; focus premium en input/botones.
- [ ] Footer en 3 columnas; secciones con separadores sutiles; jerarquía visual clara (titulares vs links).

### Mobile (390x844 y 360x800)

- [ ] Nada encimado; top bar en 2 líneas si hace falta; links “Ver envíos” y “Soporte WhatsApp” con área táctil ≥44px.
- [ ] Nav: enlaces Tienda/Destacados/Buscar/Cómo comprar y toggles con tap target ≥44px; sin overflow horizontal.
- [ ] Botón búsqueda móvil ≥44px; al abrir, input y botón cerrar con focus premium; panel sin overflow.
- [ ] Footer: 1 columna legible; links con área táctil ≥44px en mobile; sin overflow horizontal.

### General

- [ ] Inspeccionar con scroll lateral: no debe aparecer overflow horizontal en ninguna viewport.
- [ ] (Opcional) Reduced motion: no se añadieron animaciones nuevas; comportamiento existente se mantiene.

### Confirmación explícita

- **No se tocó lógica de checkout/admin/shipping/pagos/endpoints ni rutas/contratos.** Solo cambios de clases y layout en Header, TopBar y Footer.

---

## Validación

```bash
pnpm lint
pnpm build
```
