## Actualización de textos de marca y marketing

### Objetivo
Actualizar y unificar los textos de marca y marketing en el frontend con el nuevo messaging base, sin modificar lógica de negocio.

### Archivos modificados

1. **`src/app/page.tsx`** (Home):
   - Hero actualizado con título, subtítulo, CTAs y texto de apoyo
   - Bloque "¿Por qué comprar con Depósito Dental Noriega?" creado con 5 bullets
   - CTA section actualizada con eslogan

2. **`src/components/product/ProductActions.client.tsx`** (PDP):
   - Bloque de confianza simplificado a 3 líneas de texto
   - Removidos íconos y estructura compleja
   - Texto centrado y discreto

3. **`src/app/tienda/page.tsx`**:
   - Subtítulo actualizado para mencionar pedidos por sección o necesidad clínica

4. **`src/app/cuenta/ClientPage.tsx`**:
   - Texto explicativo de puntos actualizado

5. **`src/app/cuenta/pedidos/page.tsx`**:
   - Texto explicativo de puntos actualizado

### Cambios de textos principales

#### Hero de Home
- **Título**: "Insumos dentales para consultorios y clínicas en México"
- **Subtítulo**: "Compra brackets, guantes, material de ortodoncia y consumibles con atención personalizada por WhatsApp, envíos confiables y un sistema de puntos que premia cada compra."
- **CTAs**: "Ver tienda" (principal) y "Ver productos destacados" (secundario)
- **Texto de apoyo**: "Enviamos a todo México y te ayudamos a elegir el material correcto según tu práctica y tu presupuesto."

#### Bloque "¿Por qué comprar con Depósito Dental Noriega?"
1. **Enfoque en consultorios y clínicas**: "Productos pensados para odontólogos, ortodoncistas y clínicas que compran de forma recurrente."
2. **Atención directa por WhatsApp**: "Te ayudamos a resolver dudas de códigos, medidas, compatibilidad y existencias antes de comprar."
3. **Envíos a todo México**: "Trabajamos con paqueterías confiables y te compartimos tu guía para seguir el pedido en todo momento."
4. **Sistema de puntos de lealtad**: "Cada compra acumula puntos que puedes usar como descuento en pedidos futuros."
5. **Catálogo claro y precios en MXN**: "Ves el precio final en pesos mexicanos, sin sorpresas ni conversiones."

#### Bloque de confianza en PDP
- "Envíos a todo México."
- "Asesoría por WhatsApp antes y después de tu compra."
- "Pagos seguros con tarjeta en modo prueba."

#### Subtítulo de /tienda
- "Explora todos los productos disponibles en Depósito Dental Noriega y arma tus pedidos por sección o por necesidad clínica."

#### Textos de puntos de lealtad
- "Cada $1 MXN que pagas en tus pedidos genera puntos de lealtad. Al llegar al mínimo, puedes usarlos como descuento en tu siguiente compra."

#### Eslogan
- "Insumos dentales confiables, entregados a todo México."

### QA técnico

✅ **`pnpm lint`**: Solo warnings preexistentes (0 errores nuevos)
- 117 warnings (ninguno relacionado con los cambios)

✅ **`pnpm typecheck`**: Sin errores
- Todos los tipos son correctos

✅ **`pnpm build`**: Exitoso
- Build completado sin errores

### No se tocó

✅ Lógica de negocio (carrito, checkout, puntos, órdenes, stock)
✅ Tipos de TypeScript ni esquemas Zod
✅ Configuración de Supabase, Stripe o env variables
✅ Flujos de checkout ni APIs

### Notas

- Se removieron imports no utilizados (`Truck`, `MessageCircle`, `ShieldCheck` de `ProductActions.client.tsx`)
- Se añadió import de `MessageCircle` de `lucide-react` en `page.tsx` para el bloque de beneficios
- Todos los textos están en español neutro y profesional
- El estilo visual se mantiene consistente con el resto del sitio

