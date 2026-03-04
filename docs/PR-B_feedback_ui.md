# PR-B: UI de feedback del sitio

- Página `/opiniones` con formulario.
- Link "Opiniones" en el footer (sección Navegación).
- Widget flotante "Feedback" abajo a la izquierda; al hacer clic abre modal con el mismo formulario.
- No se muestra el widget en rutas `/checkout/*` (FeedbackMount con guard por pathname).

## Archivos tocados
- `src/app/opiniones/page.tsx`
- `src/components/feedback/FeedbackForm.client.tsx`
- `src/components/feedback/FeedbackWidget.client.tsx`
- `src/components/feedback/FeedbackMount.client.tsx`
- `src/app/layout.tsx` (montaje de `<FeedbackMount />`)
- `src/components/layout/Footer.tsx` (link Opiniones)
- `docs/PR-B_feedback_ui.md`

## QA checklist
- [ ] `/opiniones`: form con tipo, mensaje (min 10), rating opcional, email/phone opcionales; enviar → POST /api/feedback; mensaje success "Gracias, recibimos tu opinión."
- [ ] Footer: link "Opiniones" visible en Navegación, lleva a `/opiniones`.
- [ ] Botón "Feedback" abajo a la izquierda; al clic se abre modal con el mismo form; ESC cierra; al cerrar el foco vuelve al botón.
- [ ] En `/checkout` o `/checkout/datos` (o cualquier ruta bajo `/checkout`): el widget Feedback no se muestra.
- [ ] A11y: aria-label en botón del widget, role="dialog" aria-modal="true" en el modal.
- [ ] `pnpm -s verify` exit 0.

## Confirmaciones
- Widget no aparece en `/checkout/*`.
- No se tocó admin, checkout (solo consumo de `/api/feedback` existente), ni otros endpoints.
