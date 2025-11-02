![CI](https://github.com/hekouo/dental-noriega/actions/workflows/ci.yml/badge.svg)

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
- ✅ Performance optimizado (Lighthouse ≥85)
- ❌ Login/registro (Fase 2)
- ❌ Pagos con Stripe (Fase 2)

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

- **Performance**: ≥85
- **Accessibility**: ≥95
- **Best Practices**: ≥95
- **SEO**: ≥95

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

## 🌍 Deploy en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno en Vercel dashboard
# Project Settings → Environment Variables
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
