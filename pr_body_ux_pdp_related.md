## UX polish for PDP and related products

### Cambios principales

- **PDP (/catalogo/[section]/[slug])**
  - Reordenada la jerarquía visual: título → precio → estado → controles de compra → descripción.
  - Nuevo bloque de confianza bajo los botones (envíos a todo México, soporte por WhatsApp, pagos seguros con Stripe indicando modo prueba si aplica).
  - Sección de descripción con estilo consistente antes de los recomendados.
- **Sección "También te puede interesar" (PDP y checkout/gracias)**
  - Título/subtítulo unificados y explicación breve.
  - Layout responsivo limpio, máximo 4 productos y sin secciones vacías.
- **/checkout/gracias**
  - Recomendados con el mismo encabezado/subtítulo y skeleton ligero.
  - Estados vacíos ocultos para evitar bloques sin contenido.

### QA
- pnpm lint
- pnpm typecheck
- pnpm build

_No se tocaron configuraciones ni credenciales de Supabase/Stripe, ni la lógica del carrito, checkout o puntos._
