# PR-E3: Reseñas solo para usuarios autenticados + anti-spam 24h

## Objetivo

- Solo usuarios autenticados pueden crear reseñas (POST /api/reviews).
- Anti-spam MVP: 1 reseña por producto por usuario cada 24h.

## Qué cambió

- **POST /api/reviews** (único archivo modificado: `src/app/api/reviews/route.ts`):
  - Se usa `createServerSupabase()` (cliente con sesión/cookies), no service_role ni getPublicSupabase para el POST.
  - Si el usuario no está autenticado → **401** y no se inserta nada.
  - Si está autenticado: se obtiene `user_id` de la sesión, se valida el body con Zod (como antes), se aplica anti-spam y se inserta con `user_id`, `is_example=false`, `source='user'`, `is_published=false`.

## Respuestas

| Situación | Status | JSON |
|----------|--------|------|
| No autenticado | 401 | `{ "message": "Inicia sesión para escribir una reseña." }` |
| Ya envió reseña para el mismo producto en las últimas 24h | 429 | `{ "message": "Ya enviaste una reseña para este producto recientemente." }` |
| OK | 200 | `{ "message": "Gracias, tu reseña será revisada" }` |

## Anti-spam

Antes de insertar se consulta `public.product_reviews` con:

- `product_id` = body.product_id  
- `user_id` = user_id de sesión  
- `created_at >= now() - 24 hours`  
- `is_example = false`  

Si existe al menos una fila → 429.

## Ejemplos curl

**401 sin auth (anon):**

```bash
curl -s -X POST https://tu-dominio/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"product_id":"uuid-del-producto","rating":5,"body":"Texto de al menos diez caracteres para la reseña."}'
# → 401, body: {"message":"Inicia sesión para escribir una reseña."}
```

**200 con auth (cookie de sesión):**

```bash
curl -s -X POST https://tu-dominio/api/reviews \
  -H "Content-Type: application/json" \
  -b "sb-xxx-auth-token=..." \
  -d '{"product_id":"uuid-del-producto","rating":5,"body":"Texto de al menos diez caracteres para la reseña."}'
# → 200, body: {"message":"Gracias, tu reseña será revisada"}
```

**429 por duplicado en 24h:**

```bash
# Mismo usuario, mismo product_id, segunda petición dentro de 24h
curl -s -X POST https://tu-dominio/api/reviews \
  -H "Content-Type: application/json" \
  -b "sb-xxx-auth-token=..." \
  -d '{"product_id":"uuid-del-producto","rating":4,"body":"Otra reseña de más de diez caracteres."}'
# → 429, body: {"message":"Ya enviaste una reseña para este producto recientemente."}
```

## Confirmación

- **No se tocó:** checkout, admin, SQL/RLS, ops/sql. Solo se modificó `src/app/api/reviews/route.ts` (POST). GET /api/reviews y UI del PDP no se modificaron en este PR.

## Archivos tocados

- `src/app/api/reviews/route.ts` (solo lógica del POST)
- `docs/PR-E3_reviews_require_login.md` (este archivo)
