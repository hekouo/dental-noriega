# PR: feat/home-hero-refresh

## Objetivo
Rediseño **solo** del Home (/) con enfoque premium "Heritage Dental" sutil. Sin cambios en catálogo, featured, carrito ni checkout.

## Cambios realizados

### Hero (src/app/page.tsx)
- Sustituido el bloque azul por hero con fondo marfil/off-white y textura CSS sutil (`.bg-hero-heritage` en `globals.css`).
- Headline con serif **Playfair Display** (next/font), solo en el H1.
- Subcopy más premium y verificado; CTAs "Ver tienda" y "Contactar por WhatsApp" con variante heritage (primario + outline bronce).
- Trust line: **TrustBadges** con `variant="heritage"` (pill badges con borde bronce suave).

### Layout móvil
- Hero compacto: `py-10 sm:py-14 md:py-20` (no ocupa 2 pantallas).
- H1 responsive: `text-3xl sm:text-4xl md:text-5xl lg:text-6xl`.
- Sin márgenes negativos; contenedor `max-w-6xl mx-auto px-4`.

### Fuente y estilos
- **Layout**: añadida `Playfair_Display` con variable `--font-hero`; en Tailwind `font-hero` para el headline.
- **globals.css**: clase `.bg-hero-heritage` (marfil + gradiente + SVG noise muy sutil).

### Componentes tocados
- `HeroCTAs.client.tsx`: prop `variant="heritage"` (botón primario + outline bronce).
- `TrustBadges.tsx`: prop `variant="heritage"` (pills con borde amber suave, texto gris).

---

## Copy final

| Elemento    | Texto |
|------------|--------|
| **Headline** | Insumos dentales de calidad para tu clínica |
| **Subheadline** | Envíos a todo México. Atención por WhatsApp. Precios competitivos y pago seguro. |
| **Trust line** | Pills: Envío a todo México · Soporte WhatsApp · Puntos de lealtad · Pago seguro (labels de TrustBadges) |

---

## Checklist QA

- [ ] **Home (/)**: Hero se ve en marfil con textura sutil; headline en serif; no hay bloque azul.
- [ ] **Mobile**: Hero no ocupa 2 pantallas; H1 y botones escalan bien; sin overflow horizontal.
- [ ] **CTAs**: "Ver tienda" (primario) y "Contactar por WhatsApp" (outline) visibles y funcionales.
- [ ] **Trust line**: Pills con borde bronce/amber visibles debajo de los CTAs.
- [ ] **Tienda / Featured / Carrito / Checkout**: Sin cambios; comportamiento igual que antes.
- [ ] **Lighthouse / Performance**: Sin imágenes pesadas en hero; fondos CSS/SVG.
- [ ] **Accesibilidad**: Contraste texto/fondo suficiente en marfil; focus visible en CTAs y pills.

---

## Antes / Después (resumen)

| Antes | Después |
|-------|--------|
| Hero azul (gradient primary), texto blanco, TrustBadges mint/amber sobre azul | Hero marfil con textura sutil, texto oscuro, serif en H1, TrustBadges pills bronce |
| Hero alto (py-16–32), posible 2 pantallas en móvil | Hero más compacto (py-10–20), una pantalla en móvil |
| -mx-4 en hero | Sin márgenes negativos; overflow evitado |
