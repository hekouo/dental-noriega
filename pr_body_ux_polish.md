## Polish Checkout Datos and Addresses UX

### Resumen de cambios

Mejoras de UX en `/checkout/datos` y `/cuenta/direcciones` sin cambiar la lógica de negocio. Solo textos, validaciones visibles, estados vacíos y ajustes de layout.

### Cambios en /checkout/datos

#### Labels y textos mejorados

- **Secciones organizadas:**
  - Añadido header "Datos personales" para nombre/apellido
  - Añadido header "Dirección de envío" para campos de dirección
  
- **Labels más claros:**
  - "Nombre (s) *" y "Apellido (s) *" con placeholders de ejemplo
  - "Calle y número *" en lugar de solo "Dirección *"
  - "Colonia o asentamiento *" para mayor claridad
  
- **Textos de ayuda:**
  - Email: "Te enviaremos la confirmación y actualizaciones del pedido a este correo"
  - Teléfono: "10 dígitos, solo números (sin espacios ni guiones)"
  - Dirección: "Incluye número exterior e interior si aplica"

#### Mensajes de error mejorados

- **Validación estandarizada:**
  - Campos requeridos: "Este campo es obligatorio"
  - Email: "Ingresa un correo electrónico válido"
  - Teléfono: "Ingresa un teléfono de 10 dígitos"
  - CP: "Ingresa un código postal de 5 dígitos"
  - Checkbox de términos: "Debes aceptar el contrato de compra y el aviso de privacidad para continuar"

#### Layout y estados

- **Mejor organización visual:**
  - Secciones claramente separadas
  - Mejor espaciado entre campos
  - Checkbox de términos con fondo gris y texto de ayuda
  
- **Direcciones guardadas:**
  - Mejor descripción: "Selecciona una dirección guardada o usa una nueva"
  - Mejor contraste visual para dirección seleccionada

### Cambios en /cuenta/direcciones

#### Claridad del formulario

- **Label de nombre completo:**
  - Cambiado a: "Nombre completo (nombre y apellidos) *"
  - Añadido placeholder: "Ej: Juan Pérez García"
  - Texto de ayuda: "Incluye tu nombre y apellidos completos"
  
- **Teléfono:**
  - Añadido placeholder: "5512345678"
  - Texto de ayuda: "10 dígitos, solo números"
  
- **Checkbox de predeterminada:**
  - Mejor explicación: "Esta dirección se seleccionará automáticamente en futuros pedidos"

#### UX de lista de direcciones

- **Eliminación mejorada:**
  - Confirmación más informativa: "¿Eliminar esta dirección? Se marcará otra como predeterminada" (si aplica)
  - Auto-marcar nueva predeterminada cuando se elimina la actual (si hay otras direcciones)
  
- **Estado vacío mejorado:**
  - Mensaje más claro y útil
  - Explica cómo guardar direcciones

### Verificación técnica

- ✅ `pnpm lint` - Sin errores (solo warnings preexistentes)
- ✅ `pnpm typecheck` - Sin errores
- ✅ `pnpm build` - Exitoso

### No se tocó

- ✅ Supabase configs/keys
- ✅ Stripe configs/keys
- ✅ Estructura de datos en base de datos
- ✅ Lógica de negocio (splitFullName, buildFullName, etc.)
- ✅ Workflows de CI

### Cómo probar

1. **/checkout/datos:**
   - Completar formulario y verificar mensajes de error claros
   - Verificar secciones organizadas visualmente
   - Probar con direcciones guardadas
   - Verificar checkbox de términos con fondo y ayuda

2. **/cuenta/direcciones:**
   - Crear nueva dirección y verificar labels claros
   - Editar dirección existente
   - Eliminar dirección predeterminada y verificar que otra se marca como predeterminada
   - Verificar estado vacío cuando no hay direcciones

