## UX polish for tienda, destacados and search

### Cambios principales

#### `/tienda`
- **Título y subtítulo:**
  - Cambiado a "Tienda" con subtítulo: "Explora todos los productos disponibles en Depósito Dental Noriega"
- **Organización:**
  - Sección "Productos destacados" con subtítulo explicativo (solo se muestra si hay productos)
  - Sección "Categorías" con subtítulo y mejor layout
- **Layout:**
  - Grid responsivo de categorías (2→3 columnas)
  - Mejor espaciado y jerarquía visual

#### `/destacados`
- **Título y subtítulo:**
  - Título: "Productos destacados"
  - Subtítulo: "Productos recomendados que suelen interesar a nuestros clientes"
- **Estado vacío mejorado:**
  - Mensaje claro con CTAs a tienda y búsqueda
  - Layout consistente con otras páginas
- **Layout:**
  - Mejor espaciado y contenedor consistente

#### `/buscar`
- **Título y subtítulo:**
  - Título: "Resultados de búsqueda"
  - Subtítulo: "Encuentra los productos que necesitas"
- **Resultados:**
  - Muestra query entre comillas en el header
  - Grid responsivo mejorado (1→2→3→4 columnas)
- **Estado vacío mejorado:**
  - Mensaje: "No encontramos productos para 'X'"
  - Sugerencias: revisar ortografía, probar con menos palabras
  - CTAs a destacados y tienda
- **Paginación:**
  - Mejor layout y accesibilidad (aria-labels)

### Mejoras generales
- Títulos y subtítulos consistentes en todas las páginas
- Estados vacíos claros y útiles
- Mejor jerarquía visual
- Accesibilidad mejorada (aria-labels donde aplica)
- Layout responsivo consistente

### QA técnico
- ✅ `pnpm lint` - Sin errores nuevos (solo warnings preexistentes)
- ✅ `pnpm typecheck` - Sin errores
- ✅ `pnpm build` - Exitoso

### No se tocó
- ✅ Supabase configs/keys
- ✅ Stripe configs/keys
- ✅ Lógica de carrito/checkout/puntos
- ✅ Lógica de ProductCard
- ✅ APIs ni endpoints

### Guía de QA visual
1. **/tienda:**
   - Verificar título "Tienda" y subtítulo
   - Verificar que destacados solo aparecen si hay productos
   - Verificar grid de categorías responsivo

2. **/destacados:**
   - Verificar título y subtítulo
   - Verificar estado vacío si no hay productos
   - Verificar grid de productos

3. **/buscar:**
   - Verificar título "Resultados de búsqueda"
   - Buscar algo que no exista y verificar estado vacío
   - Buscar algo que exista y verificar resultados con query destacado
   - Verificar paginación si hay múltiples páginas

