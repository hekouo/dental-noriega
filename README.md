![CI](https://github.com/hekouo/dental-noriega/actions/workflows/ci.yml/badge.svg)

# DENTAL NORIEGA - Catálogo Digital

Sitio web de catálogo de productos dentales con carrito de compras, integración de WhatsApp y sistema de pedidos.

## ⚠️ Checkout desactivado temporalmente

Se movió `/api/checkout/create-session` a `/api_disabled/checkout/create-session` para evitar el fallo de build en Vercel.
Rehabilitar cuando existan las ENV de Stripe y el handler tenga manejo de errores.

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

# Supabase (requerido para datos en runtime)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_WHATSAPP_PHONE=5215531033715
NEXT_PUBLIC_ENABLE_DEBUG=0
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

Notas:

- Las páginas que consumen Supabase en `cuenta/*` y `checkout/*` se marcan como dinámicas (`dynamic = "force-dynamic"`, `revalidate = 0`) para evitar prerender y fallos de build si faltan ENV en Preview.
- `createAnonClient()` no crea cliente real durante el build estático; las capas de datos devuelven listas vacías en build.

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
