![CI](https://github.com/hekouo/dental-noriega/actions/workflows/ci.yml/badge.svg)
![Audit](https://github.com/hekouo/dental-noriega/actions/workflows/audit.yml/badge.svg)

# DENTAL NORIEGA - Catálogo Digital

Sitio web de catálogo de productos dentales con carrito de compras, integración de WhatsApp y sistema de pedidos.

## ⚠️ Checkout desactivado temporalmente

Se movió `/api/checkout/create-session` a `/api_disabled/checkout/create-session` para evitar el fallo de build en Vercel.
Rehabilitar cuando existan las ENV de Stripe y el handler tenga manejo de errores.

## 🔍 DEBUG

- DEBUG se desactiva en producción por defecto.
- Para habilitar temporalmente en ambientes de prueba, setear `NEXT_PUBLIC_ENABLE_DEBUG=1` (no en prod).
- Guard: `allowDebug = NODE_ENV !== 'production' && NEXT_PUBLIC_ENABLE_DEBUG !== '0'`

## 🚀 Fase 1 (Actual)

Catálogo completo con carrito "light" y consultas por WhatsApp. **Sin login ni pagos por ahora**.

### Características activas:

- ✅ Catálogo completo con búsqueda
- ✅ Productos destacados
- ✅ Carrito persistente (localStorage)
- ✅ Consulta por WhatsApp
- ✅ Performance optimizado (Lighthouse 100)
- ❌ Login/registro (Fase 2)
- ❌ Pagos con Stripe (Fase 2)

## 🚀 Fase 3.1 (Frontend Only)

**Auto-cotización de envío, totales dinámicos y búsqueda mejorada**

### Características nuevas:

- ✅ **Auto-cotización de envío** por CP + peso (tabla de zonas: metro/nacional)
  - Configuración local con tabla de zonas (metro/nacional)
  - Selector de método: pickup (gratis), standard, express
  - Cálculo automático del costo según CP y peso del carrito

- ✅ **Totales dinámicos** en `/checkout/pago`
  - Desglose: subtotal + envío = total
  - Actualización automática al cambiar método de envío

- ✅ **Resumen completo** en `/checkout/gracias`
  - Muestra total final con desglose de envío
  - Referencia de orden (`DDN-YYYYMM-XXXXXX`)

- ✅ **Página `/buscar`** con paginado
  - Resultados paginados (20 por página)
  - Resaltado de términos de búsqueda
  - Optimizado para rendimiento

- ✅ **Analytics integrado**
  - `begin_checkout`: al entrar a `/checkout/datos`
  - `add_shipping_info`: al seleccionar método de envío
  - `purchase`: al completar el pedido

### Debug del checkout

Activar con `NEXT_PUBLIC_CHECKOUT_DEBUG=1` (no usar en producción):

- Muestra estado del formulario en tiempo real
- Indica por qué el botón está deshabilitado
- Útil para debugging en desarrollo/preview

## 🛒 Flujo Checkout (MVP)

El checkout MVP permite completar pedidos sin integración de pago real. Flujo completo:

### Pasos del checkout

1. **Datos** (`/checkout/datos`): Formulario de datos de envío con validación robusta
   - Validación en tiempo real con React Hook Form + Zod
   - Campos requeridos: nombre, apellido, email, teléfono, dirección completa
   - Botón deshabilitado hasta que el formulario sea válido

2. **Pago** (`/checkout/pago`): Confirmación y método de pago
   - Resumen de datos de envío y productos seleccionados
   - Selección de método de pago (efectivo, transferencia, tarjeta)
   - Genera `orderRef` tipo `DDN-YYYYMM-XXXXXX` antes de navegar

3. **Gracias** (`/checkout/gracias`): Página de confirmación
   - Muestra `orderRef` si está presente en URL (`?orden=...`)
   - Nunca muestra 404, incluso sin parámetros
   - CTAs para seguir comprando

### Gestión de estado

- **Zustand persistente**: Estado del checkout se guarda en `localStorage`
- **Limpieza automática**: Tras completar el pago:
  - Carrito se limpia (`clearCart()`)
  - Checkout store se resetea (`resetCheckout()`)
  - Usuario navega a `/checkout/gracias?orden=DDN-...`

### Orden mock

- Cada pedido genera una referencia única: `DDN-YYYYMM-XXXXXX`
- Ejemplo: `DDN-202511-ABC123`
- Se pasa como query param a la página de gracias
- No requiere base de datos ni API real (MVP)

### Debug del checkout

Activar con `NEXT_PUBLIC_CHECKOUT_DEBUG=1`:

- Muestra estado del formulario en tiempo real
- Indica por qué el botón está deshabilitado
- Útil para debugging en desarrollo/preview

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local

# Editar .env.local con tus valores
```

## 🔧 Variables de Entorno

Edita `.env.local`:

```bash
# Configuración del sitio
NEXT_PUBLIC_SITE_NAME=DENTAL NORIEGA
NEXT_PUBLIC_SITE_URL=http://localhost:3002
NEXT_PUBLIC_WA_PHONE=525531033715

# Flags de funcionalidad (Fase 1)
NEXT_PUBLIC_ENABLE_AUTH=false
NEXT_PUBLIC_ENABLE_CHECKOUT=false
# DEBUG (no activar en producción)
NEXT_PUBLIC_ENABLE_DEBUG=0

# Supabase (opcional en Fase 1)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 🏃 Desarrollo

```bash
# Servidor de desarrollo en puerto 3002
npm run dev

# Abrir http://localhost:3002
```

## 🏗️ Producción

```bash
# Build de producción
npm run build

# Iniciar servidor en puerto 3002
npm start
```

## 🧪 Tests (Vitest + jsdom)

Este proyecto usa **Vitest** con entorno **jsdom** para tests unitarios de componentes React y utilidades.

### Ejecutar tests

```bash
# Ejecutar todos los tests
pnpm test

# Ejecutar en modo watch
pnpm test --watch

# Ejecutar un archivo específico
pnpm test src/test/components/ProductImage.test.tsx
```

### Configuración

- **Framework**: Vitest con entorno jsdom
- **Setup**: `vitest.setup.ts` configura mocks de Next.js
- **Mock de next/image**: Usa `React.createElement` en `vitest.setup.ts` para evitar problemas con JSX en entorno de test
- **Alias**: `@/` se resuelve automáticamente usando `vite-tsconfig-paths`

### ¿Por qué Playwright está excluido del scope de unit?

Los tests de **Playwright** (E2E) están en `tests/e2e/` y se ejecutan separadamente con:

```bash
pnpm test:e2e
```

Vitest está configurado para excluir estos tests (`exclude: ["tests/**", "e2e/**"]`) porque:

- Requieren un servidor corriendo
- Son más lentos y costosos
- Se ejecutan en CI con un workflow separado
- Tienen un scope diferente (integración completa vs. unidades aisladas)

### Cobertura de catálogo (bordes)

Los tests incluyen casos de borde para:

- **Secciones vacías o desconocidas**: Retornan arrays vacíos sin lanzar errores
- **Imágenes con host inválido**: Se normalizan o filtran según corresponda
- **URLs de Drive sin ID**: Se manejan gracefulmente
- **Entorno sin Supabase**: Todas las funciones retornan valores seguros (arrays vacíos o null)

Estos casos aseguran que el catálogo funciona correctamente incluso con datos incompletos o en entornos de preview sin configuración completa.

## 🔒 Branch Protection

El branch `main` tiene protección activa con los siguientes checks requeridos:

- **build**: Verifica que el proyecto compile correctamente

Para más información sobre las reglas de protección, consulta la configuración en GitHub.

## 📊 Lighthouse (Performance)

```bash
# 1. Levantar el servidor de producción
npm run build
npm start

# 2. En otra terminal, ejecutar Lighthouse
npm run lh:mobile:slowfix

# Ver resultados en lighthouse-mobile.json
# O generar HTML:
npm run lh:mobile:html
```

### Objetivos de Lighthouse (móvil):

- **Performance**: ≥80 (actual: 100)
- **Accessibility**: ≥90 (actual: 96)
- **Best Practices**: ≥90 (actual: 96)
- **SEO**: ≥90 (actual: 100)

### Auditoría Final (2025-11-10)

**Performance:** 100 | **Accessibility:** 96 | **Best Practices:** 96 | **SEO:** 100

- **LCP**: 1.8s
- **TBT**: 50ms
- **FCP**: 1.0s
- **CSS inicial**: 36.0 KB
- **Axe**: 0 violaciones

**Artifacts:** Ver [docs/audits/2025-11-10/](docs/audits/2025-11-10/)

**Release:** [v1.0.0](https://github.com/hekouo/dental-noriega/releases/tag/v1.0.0) | [PR Meta #92](https://github.com/hekouo/dental-noriega/pull/92)

## 📁 Estructura

```
src/
├── app/                    # App Router (Next.js 14)
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Home
│   ├── catalogo/          # Páginas de catálogo
│   ├── destacados/        # Productos destacados
│   ├── carrito/           # Carrito de compras
│   ├── envios/            # Página informativa
│   ├── devoluciones/      # Página informativa
│   └── privacidad/        # Página informativa
├── components/            # Componentes reutilizables
├── lib/
│   ├── config.ts         # Flags y configuración
│   ├── data/             # Carga de CSV
│   └── utils/            # Utilidades
└── public/
    └── data/             # Archivos CSV del catálogo
```

## 🔐 Fase 2 (Próximamente)

Para activar login y pagos:

1. Configura Supabase y Stripe
2. Actualiza `.env.local`:
   ```bash
   NEXT_PUBLIC_ENABLE_AUTH=true
   NEXT_PUBLIC_ENABLE_CHECKOUT=true
   ```
3. Reinicia el servidor

## 🎯 Operativa en 3 pasos

### 1. Desarrollo local

```bash
pnpm install
pnpm dev
```

### 2. Pre-deploy (verificación)

```bash
pnpm verify  # tsc + lint + build
pnpm test    # unit tests
```

### 3. Deploy en Vercel

- Push a `main` → deploy automático
- Verificar variables de entorno en Vercel dashboard
- Clear build cache si hay problemas

## ✅ QA post-deploy

Después de cada deploy, verificar estas rutas críticas:

### Rutas públicas (deben responder 200 OK)

- `/` - Home con productos destacados
- `/destacados` - Grid de 8 productos destacados
- `/catalogo` - Lista de secciones
- `/catalogo/[section]` - Productos por sección
- `/catalogo/[section]/[slug]` - PDP con quantity stepper y "Comprar ahora"
- `/buscar?q=arco` - Búsqueda con resultados paginados

### Funcionalidades MVP

- ✅ **Quantity stepper** en todas las cards (FeaturedCard, CatalogCard)
  - Validación: min 1, max 99
  - Bloquea teclado: e, -, +, .
- ✅ **Buy Now** en PDP: agrega al carrito y navega a `/checkout`
- ✅ **Búsqueda** con debounce 250ms y paginación 20/offset
- ✅ **404 con sugerencias**: muestra 4 productos de la misma sección
- ✅ **Analítica**: eventos `add_to_cart`, `buy_now`, `view_item`, `search` (solo si `NEXT_PUBLIC_GTAG_ID` está configurado)

### Guardrails

- ✅ `images.domains` en `next.config.mjs` incluye `lh3.googleusercontent.com`
- ✅ `sitemap.xml` y `robots.txt` en `/public` (Disallow: /api/)
- ✅ Bundle size limit: 240KB gzip (configurado en `.size-limit.json`)

### Debug routes (deben responder 404 en producción)

- `/api/debug/*` - Solo disponible si `ALLOW_DEBUG_ROUTES=1`

```

### Variables en Vercel:

- Copia todas las variables de `.env.local`
- Configura tu dominio personalizado en Settings → Domains
- El sitio respeta `NEXT_PUBLIC_SITE_URL` en producción

## 📱 Optimizaciones móviles

- **Imágenes**: Next.js Image con `priority` en LCP, `sizes` optimizados
- **Fuentes**: Google Fonts con `display: swap`
- **Cache**: CSV cacheados con `cache()` de React
- **Lazy loading**: Footer y componentes no críticos con `dynamic()`
- **Preconnect**: Dominios de imágenes remotas

## 🛠️ Tecnologías

- **Framework**: Next.js 14 (App Router)
- **Estilos**: Tailwind CSS
- **Base de datos**: Supabase (Fase 2)
- **Pagos**: Stripe (Fase 2)
- **Hosting**: Vercel
- **Imágenes**: Google Drive + Next.js Image

## 🗄️ Base de datos (Supabase)

### Scripts SQL activos

Los scripts SQL activos se encuentran en `ops/sql/`:

- `2025-11-02_fix_api_catalog_view_and_featured.sql` - Vista `api_catalog_with_images` con UUID y joins correctos
- `2025-11-02_featured_set_exact.sql` - Configuración exacta de productos destacados (8 posiciones)
- `csv_raw_schema.sql` - Schema para tabla `csv_raw` (importación desde CSV)
- `csv_import_pipeline_from_csv_raw.sql` - Pipeline de importación desde `csv_raw` a `products`
- `search_setup.sql` - Configuración de búsqueda full-text
- `products_title_norm_index.sql` - Índice para normalización de títulos
- `featured_setup.sql` - Setup inicial de tabla `featured`
- `qa_checks.sql` - Consultas de verificación y QA
- `cleanup_dedupe.sql` - Limpieza y deduplicación de datos

### ⚠️ Scripts legados

**NUNCA ejecutar nada dentro de `ops/sql/legacy/`**. Estos scripts están archivados por razones históricas y pueden contener cambios incompatibles con el esquema actual.

Para ver el contenido completo y SHA256 de cada script legado, consulta `ops/sql/legacy/LEGACY_SNAPSHOT.md`.

### Flujo operativo

1. **Importar CSV**: Ejecutar `csv_raw_schema.sql` y luego `csv_import_pipeline_from_csv_raw.sql`
2. **Pipeline**: Los datos se procesan y migran a `products`, `sections`, `product_images`
3. **QA**: Ejecutar `qa_checks.sql` para verificar integridad
4. **Redeploy**: Desplegar aplicación en Vercel para reflejar cambios

## 📞 Contacto

- **WhatsApp**: [+52 55 3103 3715](https://wa.me/525531033715)
- **Email**: dental.noriega721@gmail.com
- **Ubicación**: [Ver en Google Maps](https://maps.app.goo.gl/ruP2HHjLXtoKqnB57)

## 📄 Licencia

© 2024 DENTAL NORIEGA. Todos los derechos reservados.

## Verificaciones Automáticas

| Check           | PR       | Main     | Artifacts         |
| --------------- | -------- | -------- | ----------------- |
| TypeScript      | ❌ Falla | ✅ Aviso | -                 |
| Linting         | ❌ Falla | ✅ Aviso | -                 |
| Build           | ❌ Falla | ✅ Aviso | -                 |
| Bundle Size     | ❌ Falla | ✅ Aviso | size-limit.json   |
| Secret Scanning | ❌ Falla | ✅ Issue | gitleaks.sarif    |
| Dead Exports    | ⚠️ Soft  | ⚠️ Soft  | cleanup-report    |
| Dependencies    | ⚠️ Soft  | ⚠️ Soft  | cleanup-report    |
| Licenses        | ✅ Info  | ✅ Info  | licenses.csv/json |
| E2E Tests       | ✅ Info  | ✅ Info  | playwright-report |
| Lighthouse      | ✅ Info  | ✅ Info  | lhci-reports      |

**Leyenda:**

- ❌ Falla: Bloquea el merge
- ⚠️ Soft: Solo aviso (primera vez)
- ✅ Info: Solo información
```
