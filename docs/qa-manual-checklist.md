# Checklist de QA Manual - Depósito Dental Noriega

## Visión general

Depósito Dental Noriega es un catálogo digital de insumos dentales con las siguientes características principales:

- **Catálogo completo** de productos organizados por secciones (consumibles, equipos, instrumental, ortodoncia, etc.)
- **Carrito de compras** persistente con localStorage
- **Checkout completo** con Stripe (modo test) para pagos con tarjeta, efectivo y transferencia
- **Sistema de puntos de lealtad**: 1 punto por cada $1 MXN pagado, 5% de descuento al usar 1000 puntos
- **Gestión de pedidos** por email (sin login requerido)
- **Direcciones guardadas** para facilitar compras recurrentes
- **Búsqueda** con paginación y resaltado de términos
- **Productos destacados** en home y página dedicada

---

## Flujos que hay que probar siempre

### Home y navegación

- [ ] **Home (`/`)** carga sin errores en consola
  - [ ] Hero section se muestra correctamente
  - [ ] Productos destacados aparecen (si hay)
  - [ ] Sección "También te puede interesar" aparece (si hay productos)
  - [ ] Botones de CTA funcionan (Ver Productos Destacados, Explorar Catálogo)
  - [ ] Layout responsive en mobile y desktop

- [ ] **Tienda (`/tienda`)** responde correctamente
  - [ ] Header con título y subtítulo se muestra
  - [ ] Productos destacados aparecen (si hay)
  - [ ] Grid de categorías se muestra (1 columna en mobile, 2-3 en desktop)
  - [ ] Links a categorías funcionan
  - [ ] Layout responsive

- [ ] **Destacados (`/destacados`)** funciona
  - [ ] Lista de productos destacados se muestra
  - [ ] Si no hay productos, muestra mensaje claro con CTAs
  - [ ] Layout responsive

- [ ] **Búsqueda (`/buscar?q=...`)** funciona
  - [ ] Resultados se muestran correctamente
  - [ ] Términos de búsqueda se resaltan
  - [ ] Paginación funciona (20 productos por página)
  - [ ] Estado vacío se muestra si no hay resultados
  - [ ] Layout responsive

### Product Detail Page (PDP)

- [ ] **PDP (`/catalogo/[section]/[slug]`)** se muestra correctamente
  - [ ] Título del producto visible
  - [ ] Precio formateado en MXN
  - [ ] Estado de stock (En stock / Agotado) visible
  - [ ] Controles de cantidad funcionan (stepper)
  - [ ] Botón "Agregar al carrito" funciona
  - [ ] Botón "Comprar ahora" funciona (agrega al carrito y navega a checkout)
  - [ ] Botón de WhatsApp funciona (si está configurado)
  - [ ] Bloque de confianza visible (Envíos, Atención WhatsApp, Pago seguro)
  - [ ] Descripción del producto visible (si existe)
  - [ ] Sección "También te puede interesar" aparece **solo cuando hay productos relacionados**
  - [ ] Breadcrumb funciona correctamente
  - [ ] Layout responsive (imagen y detalles se apilan en mobile)

### Checkout - Flujo completo

#### Paso 1: Carrito (`/checkout`)

- [ ] Carrito muestra productos seleccionados
- [ ] Totales se calculan correctamente
- [ ] Botón "Continuar" navega a `/checkout/datos`

#### Paso 2: Datos (`/checkout/datos`)

- [ ] Formulario se muestra con todos los campos requeridos
- [ ] Validación en tiempo real funciona (errores aparecen debajo de cada campo)
- [ ] **Dirección nueva:**
  - [ ] Todos los campos se pueden llenar
  - [ ] Validación de email funciona
  - [ ] Validación de teléfono (10 dígitos) funciona
  - [ ] Validación de CP (5 dígitos) funciona
  - [ ] Checkbox "Guardar dirección" aparece si el email es válido
  - [ ] Botón "Continuar al pago" se habilita solo cuando el formulario es válido
- [ ] **Dirección guardada:**
  - [ ] Si el email tiene direcciones guardadas, aparecen en un panel
  - [ ] Se puede seleccionar una dirección guardada (autocompleta el formulario)
  - [ ] Se puede elegir "Usar una dirección nueva"
  - [ ] Si falla la carga de direcciones, muestra mensaje pero no bloquea el flujo
- [ ] Botón "Volver al carrito" funciona
- [ ] Layout responsive

#### Paso 3: Pago (`/checkout/pago`)

- [ ] Resumen de datos de envío se muestra correctamente
- [ ] Método de envío se puede seleccionar (Recoger en tienda, Estándar, Express)
- [ ] Costo de envío se actualiza según el método seleccionado
- [ ] **Pago sin puntos:**
  - [ ] Panel de puntos muestra balance actual
  - [ ] Checkbox de puntos está deshabilitado si el balance < 1000
  - [ ] Resumen de precios muestra: Subtotal, Envío, Total
  - [ ] Método de pago se puede seleccionar (Efectivo, Transferencia, Tarjeta)
- [ ] **Pago usando puntos (si el usuario tiene ≥ 1000 puntos):**
  - [ ] Checkbox "Usar mis puntos para obtener 5% de descuento" está habilitado
  - [ ] Al marcar el checkbox, aparece mensaje: "Aplicaremos un 5% de descuento sobre el total del pedido usando tus puntos"
  - [ ] Resumen de precios muestra: Subtotal, Envío, Descuento por puntos, Total
  - [ ] El descuento se calcula correctamente (5% sobre el subtotal)
  - [ ] Total final refleja el descuento
- [ ] Si hay cupón aplicado, se muestra en el resumen
- [ ] Botón "Pagar ahora" / "Continuar con pago" funciona
- [ ] Si es pago con tarjeta, se muestra el formulario de Stripe
- [ ] Si hay error (red, API, Stripe), se muestra mensaje claro con opciones (Reintentar / Volver a la tienda)
- [ ] Layout responsive

#### Paso 4: Gracias (`/checkout/gracias`)

- [ ] Página se muestra con icono de éxito
- [ ] Título "¡Gracias por tu compra!" visible
- [ ] **Resumen del pedido:**
  - [ ] Número de orden visible
  - [ ] Estado del pedido visible (Pagado / Pendiente)
  - [ ] Lista de productos con cantidades
  - [ ] Método de envío visible
  - [ ] Costo de envío visible (si aplica)
  - [ ] Total del pedido visible
- [ ] **Mensaje de puntos:**
  - [ ] Si la orden está pagada, muestra puntos ganados en ese pedido
  - [ ] Muestra balance actual de puntos
  - [ ] Si no se pueden cargar puntos, muestra mensaje suave: "Tus puntos se actualizarán en unos minutos"
- [ ] **Productos recomendados:**
  - [ ] Sección "También te puede interesar" aparece solo si hay recomendaciones
  - [ ] Si no hay recomendaciones, la sección no aparece (no muestra estado vacío)
- [ ] Si la orden no se encuentra (404), muestra mensaje claro con CTAs
- [ ] Layout responsive

---

## Pedidos y puntos

### Flujo completo de pedido con puntos

1. **Hacer pedido de prueba:**
   - [ ] Usar email de prueba (ej: `test@example.com`)
   - [ ] Agregar productos al carrito
   - [ ] Completar checkout con datos válidos
   - [ ] Seleccionar método de pago
   - [ ] Completar pago (usar tarjeta de prueba de Stripe si es tarjeta)
   - [ ] Verificar que se muestra página de gracias

2. **Ver pedido en `/cuenta/pedidos`:**
   - [ ] Ingresar el email usado en el pedido
   - [ ] Hacer clic en "Buscar pedidos"
   - [ ] Verificar que el pedido aparece en la lista
   - [ ] Verificar que muestra: ID, Fecha, Estado, Total, Método de envío
   - [ ] Hacer clic en "Ver detalle" para ver información completa

3. **Ver puntos acumulados:**
   - [ ] **En `/cuenta`:**
     - [ ] Panel "Mis puntos de lealtad" se muestra
     - [ ] Muestra puntos actuales
     - [ ] Muestra puntos acumulados históricamente
     - [ ] Muestra mensaje si puede usar descuento o cuántos puntos faltan
     - [ ] Botón "Ver mis pedidos" funciona
   - [ ] **En `/cuenta/pedidos`:**
     - [ ] Panel "Tus puntos" se muestra cuando se busca por email
     - [ ] Muestra puntos actuales y acumulados
     - [ ] Muestra información sobre cómo usar puntos

4. **Caso con puntos gastados:**
   - [ ] Hacer pedido usando descuento de puntos (requiere ≥ 1000 puntos)
   - [ ] Verificar que en `/cuenta/pedidos`, el detalle del pedido muestra:
     - [ ] Puntos ganados en ese pedido
     - [ ] Puntos usados (1000)
     - [ ] Puntos netos (ganados - usados)
   - [ ] Verificar que el balance actual refleja el gasto de puntos

---

## Direcciones guardadas

### Crear y gestionar direcciones

1. **Crear dirección desde `/cuenta/direcciones`:**
   - [ ] Ingresar email válido
   - [ ] Hacer clic en "Buscar direcciones"
   - [ ] Si no hay direcciones, aparece formulario para crear
   - [ ] Llenar formulario con datos válidos
   - [ ] Hacer clic en "Guardar dirección"
   - [ ] Verificar que la dirección aparece en la lista

2. **Marcar como predeterminada:**
   - [ ] Si es la primera dirección, se marca automáticamente como predeterminada
   - [ ] Si hay múltiples direcciones, se puede marcar otra como predeterminada
   - [ ] Verificar que solo una dirección tiene el badge "Predeterminada"

3. **Eliminar dirección predeterminada:**
   - [ ] Eliminar la dirección que tiene el badge "Predeterminada"
   - [ ] Confirmar eliminación
   - [ ] Verificar que otra dirección queda automáticamente como predeterminada (si hay otras)
   - [ ] Si era la única dirección, no debe haber error

4. **Usar dirección guardada en checkout:**
   - [ ] Ir a `/checkout/datos`
   - [ ] Ingresar el email que tiene direcciones guardadas
   - [ ] Verificar que aparece panel con direcciones guardadas
   - [ ] Seleccionar una dirección guardada
   - [ ] Verificar que el formulario se autocompleta
   - [ ] Continuar al pago y verificar que los datos se usan correctamente

---

## Errores y páginas especiales

### Página 404 (not-found)

- [ ] **Forzar 404:**
  - [ ] Navegar a una sección inexistente: `/catalogo/seccion-inexistente`
  - [ ] O navegar a un producto inexistente: `/catalogo/seccion/producto-inexistente`
- [ ] **Verificar diseño:**
  - [ ] Página se muestra centrada con card
  - [ ] Icono de error visible
  - [ ] Título "Página no encontrada" visible
  - [ ] Mensaje explicativo visible
- [ ] **Verificar CTAs:**
  - [ ] Botón "Volver al inicio" funciona y navega a `/`
  - [ ] Botón "Ir a la tienda" funciona y navega a `/tienda`
- [ ] Layout responsive

### Página de error genérico

- [ ] **Forzar error (si es posible):**
  - [ ] En desarrollo, se puede forzar un error de React
  - [ ] O esperar a que ocurra un error real durante pruebas
- [ ] **Verificar diseño:**
  - [ ] Página se muestra centrada con card
  - [ ] Icono de error (triángulo) visible
  - [ ] Título "Ocurrió un error inesperado" visible
  - [ ] Mensaje explicativo visible
- [ ] **Verificar CTAs:**
  - [ ] Botón "Intentar de nuevo" funciona (recarga la página o resetea el error)
  - [ ] Botón "Volver al inicio" funciona y navega a `/`
  - [ ] Botón "Ir a la tienda" funciona y navega a `/tienda`
- [ ] En desarrollo, se muestra error digest (solo para debugging)
- [ ] Layout responsive

---

## Notas sobre Stripe (modo test)

### ⚠️ Importante

- **El sitio está en modo test de Stripe**
- **Usar solo tarjetas de prueba** para pagos con tarjeta
- **Tarjetas de prueba recomendadas:**
  - `4242 4242 4242 4242` - Pago exitoso
  - `4000 0000 0000 0002` - Pago rechazado (para probar errores)
  - Cualquier fecha futura como expiración
  - Cualquier CVC de 3 dígitos

### Comportamiento esperado

- [ ] **Payment Element de Stripe:**
  - [ ] Se carga correctamente en `/checkout/pago` cuando se selecciona "Tarjeta"
  - [ ] Permite ingresar datos de tarjeta
  - [ ] Valida formato de tarjeta en tiempo real
  - [ ] Muestra errores de validación claros
- [ ] **Warnings en consola:**
  - [ ] Algunos métodos (Apple Pay, Link) pueden mostrar warnings en consola
  - [ ] Estos warnings **no rompen el flujo** y son normales en modo test
  - [ ] Se pueden ignorar durante pruebas
- [ ] **Pago exitoso:**
  - [ ] Al completar pago con tarjeta de prueba, redirige a `/checkout/gracias`
  - [ ] La orden se marca como "paid" automáticamente
  - [ ] Los puntos se suman correctamente

---

## Checklist de layout móvil

### Responsive en todas las páginas

- [ ] **Home (`/`):**
  - [ ] Hero se adapta bien a pantallas pequeñas
  - [ ] Botones de CTA se apilan en mobile
  - [ ] Productos destacados se muestran en grid responsive

- [ ] **Tienda, Destacados, Búsqueda:**
  - [ ] Grids bajan a 1 columna en mobile
  - [ ] Títulos y textos no se pegan a los bordes
  - [ ] Cards tienen espaciado adecuado

- [ ] **PDP:**
  - [ ] Imagen y detalles se apilan en mobile
  - [ ] Controles de cantidad y botones son fáciles de tocar
  - [ ] Bloque de confianza se lee bien

- [ ] **Checkout:**
  - [ ] Formularios son fáciles de llenar en mobile
  - [ ] Resumen de pedido se muestra claramente
  - [ ] Botones son accesibles

- [ ] **Cuenta y pedidos:**
  - [ ] Paneles se adaptan bien a pantallas pequeñas
  - [ ] Tablas/listas son legibles
  - [ ] Formularios son usables

---

## Notas adicionales

- **Errores de red:** Si hay problemas de conexión, los mensajes de error deben ser claros y ofrecer opciones de recuperación
- **Carga lenta:** Verificar que hay estados de loading apropiados (spinners, skeletons)
- **Datos faltantes:** El sitio debe manejar gracefully cuando no hay productos, direcciones, o pedidos
- **Consola del navegador:** Revisar que no hay errores críticos en la consola durante el flujo normal

---

## Cómo usar este checklist

1. **Antes de cada release:** Ejecutar todos los checks marcados como "siempre"
2. **Después de cambios en checkout:** Probar flujo completo de checkout
3. **Después de cambios en puntos:** Probar flujo completo de pedido con puntos
4. **Después de cambios en direcciones:** Probar gestión completa de direcciones
5. **Después de cambios en layout:** Verificar responsive en mobile y desktop

---

**Última actualización:** 2025-11-20

