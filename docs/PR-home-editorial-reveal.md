# PR: Home editorial reveal pass

**Branch:** `ui/home-editorial-reveal`  
**Título PR:** ui: home editorial reveal pass  
**Objetivo:** Dar a Home sensación “editorial premium Heritage” y movimiento sutil con el Motion System existente (RevealOnScroll + tokens). Solo UI; sin tocar lógica, rutas ni datos.

---

## Alcance

- **Secciones tocadas:**
  1. **¿Por qué comprar con Depósito Dental Noriega?** — Extraída a componente cliente `WhyBuySection.client.tsx`. Pass editorial: fondo stone-50/80, cards con borde stone-200/90, iconos en círculos amber (amber-50/90, borde amber-200/70), micro-sombra, spacing gap-6 sm:gap-8. Cada card envuelta en `RevealOnScroll` con stagger 60 ms. Cards con `hover-lift` y `tap-feedback`.
  2. **TrustSection** — Pass editorial: fondo stone-50/80, separador superior border-stone-200/80, cards con borde stone-200/90 e iconos amber heritage. Cada ítem envuelto en `RevealOnScroll` con stagger 60 ms. Cards con `hover-lift` y `tap-feedback`.
- **TrustBanners:** Solo consistencia con PR1/PR2: `focus-premium` y `hover-lift`/`tap-feedback` en los enlaces (desktop y móvil). No se cambió contenido ni estructura.
- **RevealOnScroll:** Añadido prop opcional `delayMs` para stagger; duración y translateY siguen usando `--motion-med` (220 ms) y 10px (dentro de 200–260 ms y 6–10 px). `prefers-reduced-motion` se respeta (contenido visible sin animación).

**No se tocó:** lógica de checkout/admin/shipping/pagos/endpoints ni rutas/contratos. No se inventó contenido ni métricas.

---

## Archivos tocados

| Archivo | Cambios |
|---------|---------|
| `src/components/motion/RevealOnScroll.client.tsx` | Prop opcional `delayMs`; se aplica `transitionDelay` en el wrapper para stagger. |
| `src/components/home/WhyBuySection.client.tsx` | **Nuevo.** Sección “Por qué comprar” con 5 cards, estilo editorial heritage y RevealOnScroll por card con stagger. |
| `src/app/page.tsx` | Sustitución del bloque inline “Por qué comprar” por `<WhyBuySection />`; eliminación de iconos SVG ya no usados; import de WhyBuySection. |
| `src/components/ui/TrustSection.tsx` | Estilo editorial (stone/amber), RevealOnScroll por ítem con stagger, hover-lift y tap-feedback en cards. |
| `src/components/marketing/TrustBanners.tsx` | focus-premium y hover-lift/tap-feedback en enlaces (desktop y móvil). |
| `docs/PR-home-editorial-reveal.md` | Este documento. |

---

## QA manual obligatorio

### Desktop (1440 y 1280)

- [ ] Home: scroll completo; reveals suaves al entrar las secciones “Por qué comprar” y TrustSection; sin flicker; jerarquía visual premium (títulos, espaciado, bordes finos).
- [ ] TrustBanners: hover con ligero lift; foco con anillo premium (bronce).

### Mobile (390x844 y 360x800)

- [ ] Home: sin overflow horizontal; tap targets OK en links/botones de TrustBanners y en el resto de secciones.
- [ ] Cards de “Por qué comprar” y TrustSection: tap feedback suave (scale 0.98) al tocar.

### Reduced motion

- [ ] Activar `prefers-reduced-motion: reduce` (DevTools o sistema) y recargar Home. Verificar que el contenido de “Por qué comprar” y TrustSection aparece visible de inmediato, sin animación de reveal.

### Contenido

- [ ] Confirmar que no se cambió copy crítico ni se inventó data (textos de cards y TrustSection idénticos a los originales).

### Confirmación explícita

- **No se tocó lógica de checkout/admin/shipping/pagos/endpoints ni rutas/contratos.**

---

## Validación

```bash
pnpm lint
pnpm build
```
