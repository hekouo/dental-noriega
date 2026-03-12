# PR-E2.2: Enlaces admin desde /cuenta

La tarjeta "Administración" en `/cuenta` (vista admin) muestra accesos a Reseñas y Opiniones y enlace al hub `/admin`. Sin cambios en checkout, pagos, envíos ni APIs.

---

## Componente modificado

- **Ruta exacta:** `src/app/cuenta/DashboardClient.tsx`
- **Tarjeta:** La que se renderiza cuando `isAdmin === true` (líneas ~121-162). No se modificó la lógica de auth; solo el contenido de la tarjeta.

---

## Cambios en la tarjeta

- **Link arriba:** "Ir al Admin →" → `/admin` (texto pequeño, `text-primary-600`).
- **Botones existentes (sin cambios):** Panel de Pedidos, Panel de Productos, Panel de Secciones.
- **Botón añadido:** "Reporte de Envíos" → `/admin/reportes/envios`.
- **Botones nuevos:** "Panel de Reseñas" → `/admin/resenas`, "Panel de Opiniones" → `/admin/opiniones`.

Mismo estilo visual: botones `rounded-xl bg-blue-600 text-white`, mismo hover. Los nuevos enlaces solo se muestran cuando la tarjeta se muestra (es decir, solo para admin).

---

## QA

1. **Login como admin:** Iniciar sesión con un usuario cuyo email esté en `ADMIN_ALLOWED_EMAILS`.
2. **Tarjeta en /cuenta:** Ir a `/cuenta`. Debe verse la tarjeta "Administración" con icono de engrane y los botones listados.
3. **Acceso a Reseñas y Opiniones:** Desde esa tarjeta, clic en "Panel de Reseñas" y "Panel de Opiniones". Debe navegar a `/admin/resenas` y `/admin/opiniones` sin escribir la URL.
4. **Acceso al hub:** Clic en "Ir al Admin →". Debe navegar a `/admin` (landing con todos los paneles).

---

## Reporte PR-E2.2

- **Archivos tocados:** `src/app/cuenta/DashboardClient.tsx`, `docs/PR-E2_2_cuenta_admin_links.md`
- **Componente de la tarjeta:** `src/app/cuenta/DashboardClient.tsx` (bloque `{isAdmin && ( ... )}` con la tarjeta "Administración").
- **Botones nuevos:** "Ir al Admin →" (link pequeño a `/admin`), "Panel de Reseñas" (`/admin/resenas`), "Panel de Opiniones" (`/admin/opiniones`). Se mantienen Panel de Pedidos, Productos, Secciones y se añade Reporte de Envíos.
- **Verify:** `pnpm -s verify` → exit 0.
