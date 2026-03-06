# PR-E2.1: Enlaces admin a Reseñas y Opiniones

Hacer accesibles `/admin/resenas` y `/admin/opiniones` desde el home del admin. Sin cambios en API, checkout ni SQL.

---

## Cambios

- **Landing admin:** Se creó `src/app/admin/page.tsx` (no existía). Muestra una tarjeta "Paneles" con botones del mismo estilo (primary-600, rounded-lg):
  - Panel de Pedidos → `/admin/pedidos`
  - Panel de Productos → `/admin/productos`
  - Panel de Secciones → `/admin/secciones`
  - Reporte de Envíos → `/admin/reportes/envios`
  - **Panel de Reseñas** → `/admin/resenas`
  - **Panel de Opiniones** → `/admin/opiniones`
- **Volver a admin:** En `AdminReviewsTable.client.tsx` y `AdminFeedbackTable.client.tsx`, el enlace "← Volver a admin" apunta ahora a `/admin` en lugar de `/admin/pedidos`.

---

## QA

1. Entrar a `/admin` (con sesión admin). Debe mostrarse la landing con la tarjeta de paneles.
2. Clic en "Panel de Reseñas". Debe navegar a `/admin/resenas` sin pegar URL.
3. Clic en "Panel de Opiniones". Debe navegar a `/admin/opiniones` sin pegar URL.
4. Desde `/admin/resenas` o `/admin/opiniones`, clic en "← Volver a admin". Debe volver a `/admin`.

---

## Reporte PR-E2.1

- **Archivos tocados:** `src/app/admin/page.tsx`, `src/components/admin/reviews/AdminReviewsTable.client.tsx`, `src/components/admin/feedback/AdminFeedbackTable.client.tsx`, `docs/PR-E2_1_admin_links.md`
- **Rutas agregadas:** Landing `/admin` con enlaces a Reseñas y Opiniones; enlace "Volver a admin" actualizado a `/admin`.
- **Verify:** `pnpm -s verify` → exit 0.
