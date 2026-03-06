# PR-E2: Admin UI reseñas y feedback

UI admin para moderar reseñas y revisar feedback usando las APIs existentes (PR-E1). Sin cambios en API, checkout, pagos ni envíos.

---

## Rutas nuevas

| Ruta | Descripción |
|------|-------------|
| `/admin/resenas` | Moderación de reseñas (pendientes / publicadas / ejemplos). Tabla con aprobar, despublicar, borrar. |
| `/admin/opiniones` | Revisión de feedback del sitio. Filtro por status, búsqueda `q`. Tabla con cambiar status y borrar. |

---

## Componentes

- `src/components/admin/reviews/AdminReviewsTable.client.tsx` — Tabla de reseñas, tabs por status, acciones.
- `src/components/admin/feedback/AdminFeedbackTable.client.tsx` — Tabla de feedback, filtro status, búsqueda, acciones.

---

## Checklist QA

1. **Ver pendientes:** Ir a `/admin/resenas`. Por defecto se muestra la pestaña "Pendientes". Comprobar que se listan reseñas con `is_published=false` y `is_example=false`.
2. **Aprobar reseña:** En una reseña pendiente, clic en "Aprobar". Debe llamar PATCH con `is_published: true`. La reseña debe desaparecer de Pendientes y aparecer en "Publicadas" al cambiar de tab.
3. **Borrar reseña:** Clic en "Borrar", confirmar en el diálogo. Debe llamar DELETE y la fila debe desaparecer.
4. **Ver feedback new:** Ir a `/admin/opiniones`. Por defecto status "Nuevo". Comprobar que se listan ítems con `status=new`.
5. **Cambiar status:** En la tabla de feedback, cambiar el select de status (ej. a "Revisado"). Debe llamar PATCH y actualizar la lista.
6. **Search q:** En opiniones, escribir texto en "Buscar (mensaje o ruta)" y clic en "Buscar". Debe enviar `q` a GET `/api/admin/feedback` y filtrar resultados.

---

## Confirmación

- No se tocó: checkout, pagos, envíos, ni ningún archivo en `src/app/api/**`.
- La UI consume únicamente las APIs existentes: GET/PATCH/DELETE `/api/admin/reviews` y GET/PATCH/DELETE `/api/admin/feedback`.
- Acceso admin: las páginas usan `checkAdminAccess()`; sin sesión admin se redirige a `/cuenta` o `notFound()`.

---

## Reporte PR-E2

- **Archivos tocados:**  
  `src/app/admin/resenas/page.tsx`, `src/app/admin/opiniones/page.tsx`,  
  `src/components/admin/reviews/AdminReviewsTable.client.tsx`,  
  `src/components/admin/feedback/AdminFeedbackTable.client.tsx`,  
  `docs/PR-E2_admin_ui_reviews_feedback.md`
- **Pantallas:**  
  **Reseñas (`/admin/resenas`):** Tabs Pendientes / Publicadas / Ejemplos, tabla con fecha, rating, título/comentario (truncado), autor, enlace al producto (admin), acciones Aprobar / Despublicar / Borrar. Estados loading, error, empty.  
  **Opiniones (`/admin/opiniones`):** Filtro status (new/reviewed/closed/spam/all), búsqueda por mensaje o ruta, tabla con fecha, ruta, tipo, mensaje (truncado), status, select para cambiar status y botón Borrar. Estados loading, error, empty.
- **Confirmación:** Aprobar (PATCH is_published true) y Borrar (DELETE) funcionan contra las APIs existentes; la UI solo consume GET/PATCH/DELETE sin modificar APIs.
- **Verify:** `pnpm -s verify` → exit 0.
