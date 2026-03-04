# PR-C: UI de reseñas en la PDP

## Objetivo
Agregar la sección de reseñas en la página de detalle de producto (PDP), consumiendo únicamente la API existente `GET/POST /api/reviews`. Sin cambios en APIs, checkout, admin ni seeds SQL.

## Ruta exacta donde se insertó la sección
- **Archivo:** `src/app/catalogo/[section]/[slug]/page.tsx`
- **Ubicación:** Debajo del bloque "Descripción del producto" (sección que renderiza `product.description`) y **antes** del bloque "Acordeones de información" (Envíos y devoluciones, Pagos y facturación, etc.).
- **Código insertado:** `<ProductReviews productId={product.id} />`, usando el UUID de `public.products.id` (`product.id`), no el slug.

## Entregables
1. `src/components/reviews/RatingStars.tsx` — Estrellas de valoración (1–5).
2. `src/components/reviews/ProductReviews.client.tsx` — Sección completa: fetch en cliente, estados loading/error/empty, lista real + ejemplos con badge "EJEMPLO", formulario "Escribir reseña" con POST a `/api/reviews`.
3. Edición mínima en `src/app/catalogo/[section]/[slug]/page.tsx`: import de `ProductReviews` e inserción de la sección como arriba.
4. Este documento: `docs/PR-C_pdp_reviews_ui.md`.

## QA manual (3 pasos)
1. **PDP carga reseñas:** Entrar a cualquier PDP (`/catalogo/[section]/[slug]`). Ver que la sección "Reseñas" aparece debajo de la descripción; en carga se muestra "Cargando reseñas…"; luego promedio + conteo y, si hay datos, reseñas reales y/o bloque "Reseñas destacadas (EJEMPLO)" con badge "EJEMPLO" en cada ejemplo.
2. **Envío de reseña devuelve mensaje "revisada":** Rellenar valoración obligatoria (1–5), opcionalmente comentario (min 10 caracteres) y nombre, enviar. Debe mostrarse el mensaje exacto: **"Gracias, tu reseña será revisada"**.
3. **Ejemplos con badge "EJEMPLO":** Si la API devuelve `example_reviews`, deben mostrarse bajo el título "Reseñas destacadas (EJEMPLO)" y cada ítem debe llevar un badge visible "EJEMPLO".

## Confirmación
- **No se tocó** `src/app/checkout/**`, `src/app/admin/**` ni `src/app/api/**`. Solo se consume la API existente GET/POST `/api/reviews`.

## Verificación
- `pnpm -s tsc && pnpm -s lint && pnpm -s build` termina con **exit 0**.  
- En entornos donde `.next` no esté bloqueado, `pnpm -s verify` (incluye `clean:next`) también debe terminar con exit 0.
