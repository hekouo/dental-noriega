## UX: Mejora del manejo de errores en checkout y pedidos

### Cambios principales

#### `/checkout/datos`
- **Errores al cargar direcciones guardadas:**
  - Mensaje visible: "No pudimos cargar tus direcciones guardadas, pero puedes seguir llenando el formulario."
  - No bloquea el flujo del checkout
  - Estilo: alert amarillo discreto

- **Errores al guardar datos:**
  - Mensaje visible si falla el guardado de datos o navegación
  - Mensaje si no hay productos seleccionados
  - Estilo: alert rojo con `role="alert"`

#### `/checkout/pago`
- **Diferenciación de errores:**
  - **Errores recuperables (5xx, red):** Muestra botón "Reintentar"
  - **Errores graves (4xx, validación):** Muestra CTAs "Volver a la tienda" y "Volver al carrito"

- **Mensajes de error visibles:**
  - Errores mostrados arriba del resumen de pago
  - Estilos diferenciados: amarillo (recuperable) vs rojo (grave)
  - Manejo mejorado de errores de Stripe (marcados como recuperables)

#### `/checkout/gracias`
- **Orden no encontrada (404):**
  - Mensaje claro: "No pudimos encontrar tu pedido."
  - CTAs a `/cuenta/pedidos` y `/tienda`
  - Estilo: alert rojo

- **Errores al cargar orden:**
  - Mensaje visible si falla la API
  - CTAs para navegar a otras secciones
  - Estilo: alert amarillo

- **Puntos de lealtad:**
  - No rompe la página si falla la API
  - Mensaje suave: "Tus puntos se actualizarán en unos minutos."

#### `/cuenta/pedidos`
- **Botón de reintentar:**
  - Añadido en mensajes de error
  - Vuelve a ejecutar el fetch automáticamente

- **Diferenciación de errores:**
  - Errores de red: "Hubo un problema al cargar tus pedidos. Intenta de nuevo en unos segundos."
  - Otros errores: "Error de conexión. Intenta de nuevo."

- **Panel de puntos:**
  - Manejo suave de errores (no bloquea la página)
  - Mensaje discreto si falla la carga

- **handleViewDetail:**
  - Mejor manejo de errores al cargar detalle de pedido
  - Diferenciación entre errores de red y otros

### Estilos y consistencia
- **Errores graves:** `bg-red-50 border-red-200 text-red-800`
- **Errores recuperables:** `bg-yellow-50 border-yellow-200 text-yellow-800`
- **Todos los mensajes incluyen `role="alert"`** para accesibilidad
- **CTAs consistentes:** Botones con estilos primarios y secundarios

### QA técnico
- ✅ `pnpm lint` - Solo warnings preexistentes (1 error en error.tsx no relacionado)
- ✅ `pnpm typecheck` - Sin errores
- ✅ `pnpm build` - Exitoso

### Archivos modificados
1. `src/app/checkout/datos/ClientPage.tsx` - Manejo de errores en direcciones y guardado
2. `src/app/checkout/pago/PagoClient.tsx` - Diferenciación de errores y CTAs
3. `src/app/checkout/gracias/GraciasContent.tsx` - Manejo de orden no encontrada y errores
4. `src/app/cuenta/pedidos/page.tsx` - Botón reintentar y mejor manejo de errores

### No se tocó
- ✅ Lógica de negocio (puntos, órdenes, stock)
- ✅ Esquemas Zod
- ✅ Helpers de loyalty
- ✅ Configuración de Supabase/Stripe

