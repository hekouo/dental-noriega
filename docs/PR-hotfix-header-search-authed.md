# PR: Hotfix header search con sesión (UI-only)

**Branch:** `ui/hotfix-header-search-authed`  
**Título PR:** fix(ui): header search authed layout (no logic)  
**Objetivo:** Corregir la regresión del buscador en header que solo se manifestaba con usuario autenticado: helper “No sé qué buscar. Haz el quiz” y/o layout colapsado/buscador angosto. Solo UI; sin tocar auth/endpoints.

---

## Diagnóstico / causa

- **SearchAutocomplete en header:** Solo se usa en `HeaderSearchBar` (desktop) y `HeaderSearchMobile` (panel móvil). Ambos pasan ya `context="header"`, por lo que el helper no se renderiza en el header en ningún estado de sesión.
- **Causa del síntoma con sesión:** Con usuario logueado, `ToothAccountMenu` muestra `LoyaltyHeaderBadge` (Nivel X · X pts) + botón “Cuenta”. Ese bloque derecho crece y, con el flex actual, comprimía el contenedor del buscador (flex-1 sin prioridad suficiente y bloque derecho sin `flex-shrink-0`), dejando el buscador angosto o rompiendo la fila.
- **Conclusión:** No había un path “authed” que renderizara SearchAutocomplete sin `context="header"`. El problema era solo de layout: el bloque derecha (cuenta/nivel/puntos) empujaba y comprimía el buscador.

---

## Cambios (UI only)

### 1. Layout del header (layout.tsx)

- Contenedor del buscador desktop: `hidden md:flex flex-1 min-w-0 w-full max-w-md mx-2 min-w-[180px]` para que tenga prioridad de ancho y no baje de 180px.
- Bloque derecha (links + búsqueda móvil + cuenta): `flex-shrink-0 min-w-0` para que no se encoja y no empuje el buscador; se mantienen los mismos links.

### 2. LoyaltyHeaderBadge

- Link del badge: `max-w-[160px]` y en desktop `max-w-[140px]` en el span del texto.
- Texto “Nivel X” y “·” con `shrink-0`; puntos con `truncate` para no desbordar.
- Mobile: `truncate` en el span de puntos.
- Sin cambios de lógica ni de API.

### 3. ToothAccountMenu

- Contenedor cuando hay user: `flex-shrink-0 min-w-0` y `gap-2 sm:gap-3` para no comprimir el buscador y mantener espaciado estable.

### 4. context="header"

- Confirmado: `HeaderSearchBar` y `HeaderSearchMobile` siguen pasando `context="header"` a `SearchAutocomplete`. En header no se renderiza el helper en ningún estado de sesión.
- `/buscar` sigue usando `QuickSearchBar` → `SearchAutocomplete` sin `context` (default `"page"`), por lo que el helper puede mostrarse allí si el quiz está habilitado.

---

## Archivos tocados

| Archivo | Cambios |
|---------|---------|
| `src/app/layout.tsx` | Contenedor buscador: `md:flex`, `min-w-[180px]`. Bloque derecha: `flex-shrink-0 min-w-0`. |
| `src/components/header/LoyaltyHeaderBadge.tsx` | `max-w-[160px]`, truncate en nivel/puntos para no empujar el buscador. |
| `src/components/ToothAccountMenu.tsx` | Contenedor authed: `flex-shrink-0 min-w-0`, `gap-2 sm:gap-3`. |
| `docs/PR-hotfix-header-search-authed.md` | Este documento. |

---

## QA manual

### Desktop 1440 y 1280

- [ ] Home sin sesión: header estable, buscador con ancho correcto, sin helper, dropdown alineado.
- [ ] Home con sesión: mismo comportamiento; badge de puntos truncado si es largo; buscador no angosto ni colapsado.
- [ ] /tienda, /destacados: header estable con y sin sesión.
- [ ] /buscar: helper puede mostrarse (context page) y no rompe layout.

### Mobile 390x844 y 360x800

- [ ] Header: con y sin sesión, sin helper en el panel de búsqueda; input a ancho completo; resultados ok.
- [ ] Tap targets ≥44px; overlay y cierre del panel correctos.

### Reduced motion

- [ ] No se añaden animaciones que ignoren prefers-reduced-motion.

### Confirmación explícita

**No se tocó lógica de checkout/admin/shipping/pagos/endpoints.** Solo clases y layout del header y del badge de lealtad.
