# PR-E3.2: Auto-publicar reseñas (solo autenticados)

## Objetivo

- Mantener `POST /api/reviews` protegido: **solo usuarios autenticados** pueden crear reseñas (401 si no hay sesión).
- Auto-publicar reseñas de usuarios autenticados (**is_published=true**) sin cambiar SQL/RLS: el insert se hace con **Service Role** en backend (server-only) después de validar sesión.
- Mantener anti-spam MVP: **1 reseña por producto por usuario cada 24h** (429).

## Qué cambió

### `src/app/api/reviews/route.ts` (solo POST)

- **401** si no hay usuario autenticado:
  - `{ "message": "Inicia sesión para escribir una reseña." }`
- **Anti-spam** (sin debilitar, fail-closed):
  - Query: `product_id + user_id + created_at >= now-24h + is_example=false`
  - Si la query falla → 500 `{ "message": "No se pudo validar anti-spam. Intenta de nuevo." }` y **no** inserta.
  - Si existe una reseña reciente → 429 `{ "message": "Ya enviaste una reseña para este producto recientemente." }`
- **Insert con Service Role (server-only)**:
  - Se valida sesión con `createServerSupabase()` (cookies) y se obtiene `user.id`.
  - Luego se inserta con `@supabase/supabase-js` usando `SUPABASE_SERVICE_ROLE_KEY`:
    - `user_id = user.id`
    - `is_published = true`
    - `is_example = false`
    - `source = "user"`
    - `meta`: `ip_hash_day` (sha256(ip|YYYY-MM-DD) truncado) y `ua` (user-agent) cuando existe.
- Respuesta **200**:
  - `{ "message": "Gracias, tu reseña fue publicada." }`

## Ejemplos curl

**401 sin auth:**

```bash
curl -s -X POST https://tu-dominio/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"product_id":"uuid-del-producto","rating":5,"body":"Texto de al menos diez caracteres."}'
```

**200 con auth (cookie de sesión):**

```bash
curl -s -X POST https://tu-dominio/api/reviews \
  -H "Content-Type: application/json" \
  -b "sb-xxx-auth-token=..." \
  -d '{"product_id":"uuid-del-producto","rating":5,"body":"Texto de al menos diez caracteres."}'
```

**429 duplicado 24h:**

```bash
curl -s -X POST https://tu-dominio/api/reviews \
  -H "Content-Type: application/json" \
  -b "sb-xxx-auth-token=..." \
  -d '{"product_id":"uuid-del-producto","rating":4,"body":"Otra reseña de más de diez caracteres."}'
```

## Nota

- El admin puede gestionar/borrar reseñas desde `/admin/resenas`.

## Confirmación de alcance

- No se tocó checkout ni admin UI.
- No se tocaron APIs admin.
- No se modificó SQL/RLS ni `ops/sql`.
- GET `/api/reviews` no se cambió.

