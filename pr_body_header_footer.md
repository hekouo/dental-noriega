## UX polish for header, account navigation and footer

### Cambios principales

#### Header (layout.tsx)
- **Enlaces de navegación:**
  - Añadidos enlaces a `/tienda`, `/destacados`, `/buscar` en navegación desktop
  - Mejorados `aria-label` para todos los enlaces de navegación
  - Añadidos `transition-colors` para estados hover

#### Menú de cuenta (ToothAccountMenu.tsx)
- **Badge de carrito:**
  - Mejorado `aria-label` para mostrar cantidad de productos
  - Badge solo se muestra cuando `qty > 0`
- **Botón de cuenta:**
  - Añadido `aria-expanded` para indicar estado del menú
  - Mejorados estados de focus (`focus-visible:ring`)
  - Mejorado `aria-label` dinámico según estado de autenticación
- **Menú desplegable:**
  - Reorganizados items con separador visual
  - Cambiado "Entrar" a "Iniciar sesión" para consistencia
  - Cambiado "Mis pedidos" a "Buscar mis pedidos" para usuarios no autenticados
  - Eliminado enlace "Ir a checkout" (redundante con badge de carrito)
  - Añadidos `role="menu"` y `role="menuitem"` para mejor accesibilidad
  - Añadidos `transition-colors` para hover states

#### Footer (SiteFooter.tsx)
- **Nueva sección "Navegación":**
  - Enlaces a `/tienda`, `/destacados`, `/cuenta`, `/cuenta/pedidos`
- **Layout mejorado:**
  - Grid responsivo: `sm:grid-cols-2 lg:grid-cols-4` para mejor experiencia móvil
  - Mejor separación visual con `border-t` para sección de copyright
- **Accesibilidad:**
  - Añadidos `aria-label` para enlaces de contacto (WhatsApp, email, maps, redes sociales)
- **Reorganización:**
  - Sección "Síguenos" movida dentro de columna "Contacto" con separador visual
  - Añadidos `transition-colors` para hover states

### Mejoras generales
- Accesibilidad mejorada en todos los componentes (aria-labels, roles, focus states)
- Consistencia en textos (español neutro profesional)
- Layout responsivo mejorado
- Transiciones suaves en hover states

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
1. **Header:**
   - Verificar enlaces a Tienda, Destacados, Buscar en desktop
   - Verificar que el menú de cuenta funciona correctamente
   - Verificar que el badge de carrito muestra cantidad correcta

2. **Menú de cuenta:**
   - Verificar que el menú se abre/cierra correctamente
   - Verificar que los enlaces funcionan (Mi cuenta, Mis pedidos, Mis direcciones)
   - Verificar que el badge de carrito solo aparece cuando hay productos

3. **Footer:**
   - Verificar layout responsivo (mobile: 2 columnas, desktop: 4 columnas)
   - Verificar que todos los enlaces funcionan
   - Verificar que la sección de navegación incluye enlaces a tienda, destacados, cuenta, pedidos

