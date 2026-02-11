# PR: Hotfix header search helper/layout (UI-only)

**Branch:** `fix/header-search-helper-layout`  
**Título PR:** fix(ui): header search helper/layout (no logic)  
**Objetivo:** En contexto HEADER no debe renderizarse NADA del helper (“No sé qué buscar…”, “Haz el quiz”). Input y dropdown con ancho correcto. Solo UI; cero lógica.

---

## Problema (producción ddnshop.mx)

El buscador del header muestra un bloque angosto con “No sé qué buscar. Haz el quiz” debajo/pegado al input; el dropdown/layout se comprime y rompe la barra. Persistía tras PR #511.

---

## Solución

- **SearchAutocomplete:** Prop explícita `context?: "header" | "page"` (default `"page"`).
  - Si `context === "header"`: **no se renderiza el bloque del helper** (ni texto ni link; cero).
  - Si `context === "page"`: se puede mostrar “No sé qué buscar. Haz el quiz” cuando `NEXT_PUBLIC_ENABLE_QUIZ === "true"`.
- **Layout (ya aplicado y reforzado):**
  - Root wrapper: `relative w-full min-w-0`
  - Input container: `relative w-full min-w-0`
  - Dropdown: `absolute left-0 right-0 top-full z-50 mt-2 w-full min-w-0`
- **Header:** Desktop (HeaderSearchBar) y móvil (HeaderSearchMobile) pasan `context="header"`.
- **Página /buscar:** Usa QuickSearchBar → SearchAutocomplete sin `context` (default `"page"`), por lo que el helper puede mostrarse allí sin romper layout.

---

## Archivos tocados

| Archivo | Cambios |
|---------|---------|
| `src/components/search/SearchAutocomplete.client.tsx` | Prop `context?: "header" \| "page"`; helper solo si `context === "page"`. Eliminado `showQuizLink`. |
| `src/components/header/HeaderSearchBar.client.tsx` | `context="header"` en SearchAutocomplete. |
| `src/components/header/HeaderSearchMobile.client.tsx` | `context="header"` en SearchAutocomplete. |
| `docs/PR-hotfix-header-search-helper.md` | Este documento. |

---

## QA manual

### Desktop (1440 y 1280)

- [ ] Home: header con buscador alineado; **ningún** texto “No sé qué buscar” ni “Haz el quiz” debajo del input.
- [ ] Al escribir en el input: dropdown debajo del input, ancho completo, sin columna estrecha.
- [ ] Cerrar dropdown y comprobar que la barra del header no está rota.

### Mobile (390x844 y 360x800)

- [ ] Header: solo icono Buscar (sin helper).
- [ ] Al abrir panel de búsqueda: input y panel ok; **ningún** helper “No sé qué buscar” en el panel del header.
- [ ] Tap targets ≥44px; overlay y cierre correctos.

### Página /buscar

- [ ] Input y dropdown normales; si quiz está activo, el helper “No sé qué buscar. Haz el quiz” puede aparecer en la página sin romper layout.

### Confirmación explícita

**No se tocó lógica de checkout/admin/shipping/pagos/endpoints.** Solo UI del buscador en header y prop de contexto.

---

## Producción / deploy

Si en ddnshop.mx el problema persiste tras mergear este PR, comprobar en Vercel el **commit SHA del último Production Deployment** y que coincida con el merge de esta rama. Si está desfasado, indicarlo en el reporte; el fix queda listo en código.
