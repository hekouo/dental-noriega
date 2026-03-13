# PR-E3.1: UX reseñas PDP con login requerido

## Objetivo

- Mejorar la UX de reseñas en PDP ahora que `POST /api/reviews` requiere login.
- Comunicar claramente al usuario anónimo que debe iniciar sesión y evitar perder el texto escrito.

## Cambios

### `src/components/reviews/ProductReviews.client.tsx`

- Manejo específico de respuestas del backend al enviar reseña:
  - **401**: muestra mensaje inline *“Inicia sesión para escribir una reseña.”* y un link **“Iniciar sesión”** a `/cuenta`. No limpia el formulario.
  - **429**: muestra el mensaje devuelto por el backend (`message` o `error`) inline.
  - **200 (ok)**: mantiene el mensaje de éxito existente *“Gracias, tu reseña será revisada”* y limpia el formulario.
- Área de mensajes accesible:
  - Se agrega un contenedor para success/error con `role="status"` y `aria-live="polite"`, para lectores de pantalla.
  - Mantiene el botón en estado disabled mientras `submitStatus === "loading"` y el texto de botón cambia a “Enviando…”.

## QA manual

1. **Usuario anónimo:**
   - Ir a PDP.
   - Llenar el formulario de reseña y enviar.
   - Ver mensaje: *“Inicia sesión para escribir una reseña.”* y el link **“Iniciar sesión”** que lleva a `/cuenta`.
   - Confirmar que el texto del formulario no se pierde.

2. **Usuario autenticado (sesión activa):**
   - Enviar una reseña válida.
   - Ver mensaje de éxito *“Gracias, tu reseña será revisada”*.
   - Confirmar que el formulario se limpia.

3. **Duplicado 24h (mismo usuario + producto):**
   - Enviar dos reseñas seguidas para el mismo producto.
   - La segunda debe mostrar el mensaje de **429** retornado por el backend (anti-spam 24h).

## Confirmación de alcance

- No se tocaron APIs (`src/app/api/**` sigue intacto en este PR).
- No se tocó checkout ni admin.
- No se hicieron cambios en SQL ni RLS.

