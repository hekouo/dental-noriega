# PR-E1: Admin API reviews y feedback

APIs admin server-only para gestionar reseñas (`public.product_reviews`) y feedback del sitio (`public.site_feedback`). Sin UI. Requieren sesión de admin (mismo mecanismo que el resto de `/api/admin/*`).

---

## Endpoints

### Reviews (product_reviews)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/reviews` | Listar reseñas (filtros y paginación) |
| PATCH | `/api/admin/reviews/[id]` | Moderar: actualizar `is_published` |
| DELETE | `/api/admin/reviews/[id]` | Borrar reseña |

### Feedback (site_feedback)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/feedback` | Listar feedback (filtros y paginación) |
| PATCH | `/api/admin/feedback/[id]` | Actualizar `status` |
| DELETE | `/api/admin/feedback/[id]` | Borrar feedback |

---

## Request / Response shapes

### GET /api/admin/reviews

- **Query:** `status` = `pending` \| `published` \| `examples` \| `all` (default: `pending`), `product_id` (opcional), `limit` (default 50, max 100), `cursor` (opcional, offset como string).
- **Response:** `{ items: Review[], nextCursor: string | null }`
- **Review:** `id`, `created_at`, `product_id`, `rating`, `title`, `body`, `author_name`, `is_example`, `is_published`, `source`, `user_id`, `meta`

### PATCH /api/admin/reviews/[id]

- **Body:** `{ is_published: boolean }`
- **Response:** `{ ok: true, review: { id, is_published } }` o error 4xx/5xx

### DELETE /api/admin/reviews/[id]

- **Response:** `{ ok: true }` o error 5xx

### GET /api/admin/feedback

- **Query:** `status` = `new` \| `reviewed` \| `closed` \| `spam` \| `all` (default: `new`), `q` (opcional, búsqueda en message/page_path), `limit` (default 50, max 100), `cursor` (opcional).
- **Response:** `{ items: Feedback[], nextCursor: string | null }`
- **Feedback:** `id`, `created_at`, `page_path`, `type`, `message`, `rating`, `email`, `phone`, `user_id`, `status`, `meta`

### PATCH /api/admin/feedback/[id]

- **Body:** `{ status: "new" | "reviewed" | "closed" | "spam" }`
- **Response:** `{ ok: true, feedback: { id, status } }` o error 4xx/5xx

### DELETE /api/admin/feedback/[id]

- **Response:** `{ ok: true }` o error 5xx

---

## Ejemplos curl

Reemplaza `https://tu-dominio.com` y asegúrate de enviar las cookies de sesión (o el header que use tu app para auth). Las rutas usan la sesión del usuario para validar admin vía `ADMIN_ALLOWED_EMAILS`.

### Reviews (4 ejemplos)

```bash
# 1) Listar reseñas pendientes (default)
curl -s -b "tu-cookie-de-sesion" "https://tu-dominio.com/api/admin/reviews"

# 2) Listar reseñas publicadas, filtro por product_id y limit
curl -s -b "tu-cookie-de-sesion" "https://tu-dominio.com/api/admin/reviews?status=published&product_id=UUID&limit=20"

# 3) Publicar una reseña (PATCH)
curl -s -X PATCH -b "tu-cookie-de-sesion" -H "Content-Type: application/json" \
  -d '{"is_published":true}' "https://tu-dominio.com/api/admin/reviews/REVIEW_UUID"

# 4) Borrar una reseña
curl -s -X DELETE -b "tu-cookie-de-sesion" "https://tu-dominio.com/api/admin/reviews/REVIEW_UUID"
```

### Feedback (2 ejemplos)

```bash
# 5) Listar feedback nuevo y búsqueda por texto
curl -s -b "tu-cookie-de-sesion" "https://tu-dominio.com/api/admin/feedback?status=new&q=contacto&limit=25"

# 6) Marcar feedback como revisado
curl -s -X PATCH -b "tu-cookie-de-sesion" -H "Content-Type: application/json" \
  -d '{"status":"reviewed"}' "https://tu-dominio.com/api/admin/feedback/FEEDBACK_UUID"
```

---

## Confirmación

- **No se tocó:** checkout, pagos, envíos (Stripe/Skydropx/orders/cart). Solo rutas nuevas bajo `/api/admin/reviews` y `/api/admin/feedback`.
- **Seguridad:** Admin-only mediante `checkAdminAccess()` (sesión + `ADMIN_ALLOWED_EMAILS`). Lectura/escritura a Supabase con **Service Role** en server; la clave no se expone al cliente.
- **Nota:** Estos endpoints requieren estar logueado como admin (email en `ADMIN_ALLOWED_EMAILS`).

---

## Reporte final PR-E1

- **Archivos tocados:**  
  `src/app/api/admin/reviews/route.ts`, `src/app/api/admin/reviews/[id]/route.ts`,  
  `src/app/api/admin/feedback/route.ts`, `src/app/api/admin/feedback/[id]/route.ts`,  
  `docs/PR-E1_admin_api_reviews_feedback.md`
- **Seguridad:** Admin-only con `checkAdminAccess()`; Supabase con **Service Role** solo en server. No se expone la clave al cliente.
- **Verify:** `pnpm -s verify` → exit 0.
- **Doc:** [docs/PR-E1_admin_api_reviews_feedback.md](PR-E1_admin_api_reviews_feedback.md)
