# PR-H1: Hero & Trust Rail — Home UI/UX Upgrade

## Objetivo

Crear un Hero editorial premium con background sutil animado, eliminar el saludo "Buenos días" y agrupar beneficios en un Icon Rail con iconos. Agregar componente `<Logo>` (placeholder) para monograma + wordmark.

## Cambios

### Componentes creados

| Archivo | Descripción |
|--------|-------------|
| `src/components/home/AmbientBackground.tsx` | Gradiente animado MUY sutil (`position: absolute; inset: 0`). Desactiva animación con `@media (prefers-reduced-motion: reduce)`. |
| `src/components/home/HeroIntro.tsx` | Layout responsive, copy principal sin saludo, CTAs (Explorar catálogo | Habla con un asesor), Logo, IconRail. |
| `src/components/common/IconRail.tsx` | Chips con iconos (lucide), `overflow-x-auto` + `scroll-snap-type: x mandatory`, hover micro (scale 1.02–1.05 + sombra suave). Reduced motion: sin animaciones automáticas. |
| `src/components/common/Logo.tsx` | Placeholder: texto "DDN" + contenedor para futuro SVG. Props: `variant?: 'horizontal' | 'mark'`, `size?: 'sm' | 'md' | 'lg'`. |

### Integración

| Archivo | Cambio |
|--------|--------|
| `src/app/page.tsx` | Reemplaza hero anterior por `<HeroIntro />`. Quita TrustBadges y HeroCTAs del hero. |
| `src/app/globals.css` | Añade keyframes `ambient-shift` para AmbientBackground y override `prefers-reduced-motion`. |

### Estilo

- Editorial / Heritage Modern: bordes 2xl, sombras suaves.
- Tipografía: jerarquía clara (títulos más grandes, subtítulos más chicos).
- Sin librerías nuevas.

## Archivos tocados

- `src/components/home/AmbientBackground.tsx` (nuevo)
- `src/components/home/HeroIntro.tsx` (nuevo)
- `src/components/common/IconRail.tsx` (nuevo)
- `src/components/common/Logo.tsx` (nuevo)
- `src/app/page.tsx` (modificado)
- `src/app/globals.css` (modificado)
- `docs/PR-H1_home-hero-iconrail.md` (este archivo)

## QA manual

- **Desktop 1440px:** Hero ~60–70vh, CTAs visibles, IconRail scrolleable horizontalmente.
- **Mobile 390px:** Hero apila bien, IconRail swipe horizontal.
- **prefers-reduced-motion:** Background sin animación (gradiente fijo).
- **Tap targets:** CTAs y chips IconRail min-h 44px.

## Confirmación

- **No se tocó:** checkout, Stripe, webhook, Supabase, admin, shipping.
- Header no modificado (PR-H4).
- `prefers-reduced-motion` respetado en AmbientBackground.
- Build/lint/types OK.
