Este PR agrega una página informativa "Cómo comprar" y enlaces de navegación en el header y footer.

### Cambios principales

- **Nueva página `/como-comprar`:**
  - Guía completa sobre cómo comprar en Depósito Dental Noriega
  - Secciones: Quiénes somos, Cómo comprar, Envíos y envío gratis, Atención por WhatsApp, Puntos de lealtad, Pagos, Contacto
  - Usa constantes existentes (`FREE_SHIPPING_THRESHOLD_MXN`, `LOYALTY_*`) para información precisa
  - Incluye botones de contacto por WhatsApp usando helpers existentes
  - Metadata SEO optimizada

- **Enlaces de navegación:**
  - Agregado "Cómo comprar" en el header principal (después de "Buscar")
  - Agregado "Cómo comprar" en la sección "Información" del footer

### No se tocó

- Supabase (ninguna tabla, query o configuración)
- Stripe (ninguna configuración ni lógica de pagos)
- Lógica de negocio (carrito, checkout, puntos, envíos)
- Solo contenido estático y navegación

### QA técnico

- `pnpm lint` ✅
- `pnpm typecheck` ✅
- `pnpm build` ✅

