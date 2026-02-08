# PR A: Motion System (DDN)

Branch: `ui/motion-system`  
Objetivo: microinteracciones premium consistentes en toda la web **sin tocar lógica de negocio**.

## Reglas

- **Sin librerías pesadas:** no se instaló framer-motion; todo con CSS + TS (client components ligeros).
- **No animar:** formularios de pago, checkout, stripe, admin.
- **Reduced motion:** todas las animaciones se desactivan cuando `prefers-reduced-motion: reduce`.
- **SSR/streaming:** PageFadeIn no bloquea el render del servidor ni el streaming de `children`.

---

## Tokens globales (`:root` en `globals.css`)

| Variable | Valor |
|----------|--------|
| `--motion-fast` | 150ms |
| `--motion-med` | 220ms |
| `--motion-slow` | 260ms |
| `--motion-ease-out` | cubic-bezier(0.16, 1, 0.3, 1) |
| `--motion-ease` | cubic-bezier(0.2, 0.8, 0.2, 1) |
| `--motion-ease-in-out` | cubic-bezier(0.4, 0, 0.2, 1) |

---

## Clases CSS reutilizables

| Clase | Uso |
|-------|-----|
| `.motion-base` | `transition-property`: transform, opacity, box-shadow, background-color, border-color |
| `.motion-fast` | Duración 150ms + ease |
| `.motion-med` | Duración 220ms + ease |
| `.hover-lift` | Hover: translateY(-2px) + sombra suave |
| `.tap-feedback` | Active: scale(0.98) |
| `.focus-premium` | Focus-visible: ring sutil bronce/neutral (outline 2px) |
| `.shimmer-silk` | Skeleton shimmer suave (warm-neutral, 1.2s linear infinite) |

---

## Componentes

### PageFadeIn (`src/components/motion/PageFadeIn.client.tsx`)

- Envuelve el contenido principal en el layout (solo `children` del `<main>`).
- Animación: opacity 0→1 + translateY(6px→0) en 200ms.
- Se desactiva si `prefers-reduced-motion`.
- Re-ejecuta la animación al cambiar de ruta (`usePathname()`).

### RevealOnScroll (`src/components/motion/RevealOnScroll.client.tsx`)

- IntersectionObserver con `threshold` 0.12 por defecto.
- Al entrar en viewport añade la clase `is-revealed` (fade + translateY(10px)).
- Respeta reduced motion.
- **No aplicado masivamente** en este PR; listo para PRs siguientes.

---

## QA manual requerido

### Desktop

- [ ] **Hover lift en cards de prueba:** aplicar `hover-lift` a una card (por ejemplo en tienda o destacados) y comprobar que al hacer hover sube ligeramente (-2px) y gana sombra, sin romper layout.
- [ ] **PageFadeIn:** navegar entre páginas (Home → Tienda → Destacados) y verificar que el contenido principal hace un fade-in suave al cargar.

### Mobile

- [ ] **Tap feedback:** en un botón o card con `tap-feedback`, comprobar que al pulsar se siente un ligero scale (0.98) sin retraso molesto.

### Accesibilidad (Reduced motion)

- [ ] **Simular reduced motion:** en DevTools o en el SO (Windows: Configuración → Accesibilidad → Efectos visuales → Animaciones desactivadas; macOS: Preferencias → Accesibilidad → Reducir movimiento). Recargar y navegar.
- [ ] Verificar que **no** hay fade-in de página ni hover-lift ni tap scale ni shimmer animado; el contenido sigue siendo usable y visible de inmediato.

### Lighthouse / Performance

- [ ] No se añaden assets pesados ni JS extra innecesario; el bundle de los componentes motion es mínimo (CSS + IntersectionObserver/usePathname).
- [ ] Ejecutar Lighthouse y confirmar que no hay regresiones claras por el motion system.

---

## Archivos tocados en este PR

- `src/app/globals.css` — tokens, utilidades, shimmer, reduced motion, clases PageFadeIn/RevealOnScroll
- `src/components/motion/PageFadeIn.client.tsx` — nuevo
- `src/components/motion/RevealOnScroll.client.tsx` — nuevo
- `src/app/layout.tsx` — integración de PageFadeIn envolviendo `children` del main
- `docs/PR-motion-system.md` — este doc

---

## Validación antes de abrir PR

```bash
pnpm lint
pnpm build
git diff --name-only origin/main...HEAD
```

`git diff` debe incluir **solo** archivos del motion system (globals.css, motion components, docs, y tailwind si se hubiera tocado; en este PR no se modifica tailwind).
