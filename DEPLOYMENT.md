# 🚀 Guía de Deployment - DENTAL NORIEGA

## Preparación pre-deploy

### 1. Verificar build local
```bash
npm run build
npm start

# Verificar http://localhost:3002
```

### 2. Ejecutar Lighthouse
```bash
# En otra terminal (con el servidor corriendo)
npm run lh:mobile:slowfix

# Verificar puntajes objetivo:
# ✅ Performance ≥ 85
# ✅ Accessibility ≥ 95  
# ✅ Best Practices ≥ 95
# ✅ SEO ≥ 95
```

## Deploy en Vercel

### Instalación de Vercel CLI
```bash
npm i -g vercel
```

### Primer deploy
```bash
# Desde la raíz del proyecto
vercel

# Responde:
# - Set up and deploy? Yes
# - Which scope? Tu cuenta
# - Link to existing project? No
# - Project name? dental-noriega (o el que prefieras)
# - Directory? ./
# - Override settings? No
```

### Configurar variables de entorno

1. Ve a [vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings → Environment Variables**
4. Agrega las siguientes variables:

```bash
# Producción
NEXT_PUBLIC_SITE_NAME=DENTAL NORIEGA
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
NEXT_PUBLIC_WA_PHONE=525531033715

# Flags Fase 1 (sin login ni pagos)
NEXT_PUBLIC_ENABLE_AUTH=false
NEXT_PUBLIC_ENABLE_CHECKOUT=false

# Supabase (opcional para Fase 1)
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key_supabase
```

5. **Importante**: Selecciona "Production" y "Preview" para cada variable
6. Guarda y redeploy

### Redeploy con variables
```bash
vercel --prod
```

## Configurar dominio personalizado

### En Vercel Dashboard

1. Ve a **Settings → Domains**
2. Agrega tu dominio (ej: `dentalNoriega.com.mx`)
3. Sigue las instrucciones para configurar DNS:
   - **A Record**: apunta a la IP de Vercel
   - **CNAME**: apunta `www` a tu dominio Vercel

### Actualizar variable de entorno

Después de configurar el dominio:

```bash
NEXT_PUBLIC_SITE_URL=https://tudominio.com.mx
```

Redeploy:
```bash
vercel --prod
```

## Verificación post-deploy

### Checklist básico

- [ ] Sitio accesible en la URL de producción
- [ ] Home carga correctamente
- [ ] Catálogo muestra productos
- [ ] Búsqueda funciona
- [ ] Carrito persiste entre sesiones
- [ ] Botones de WhatsApp abren chat correctamente
- [ ] Imágenes de Google Drive cargan bien
- [ ] Footer con enlaces a Envíos/Devoluciones/Privacidad
- [ ] Responsive en móvil y desktop
- [ ] No aparecen errores en consola del navegador

### Lighthouse en producción

```bash
# Reemplaza con tu URL de producción
lighthouse https://tudominio.com.mx \
  --only-categories=performance,accessibility,seo,best-practices \
  --form-factor=mobile \
  --output=html \
  --output-path=./lighthouse-prod.html
```

## Activar Fase 2 (Login + Pagos)

Cuando estés listo para activar login y pagos:

### 1. Configurar Supabase

1. Crea proyecto en [supabase.com](https://supabase.com)
2. Ejecuta los scripts SQL:
   - `supabase-setup.sql`
   - `supabase-functions.sql`
3. Configura autenticación (email/password)
4. Obtén las credenciales

### 2. Configurar Stripe

1. Crea cuenta en [stripe.com](https://stripe.com)
2. Activa modo live
3. Obtén API keys (publishable y secret)
4. Configura webhook para `/api/stripe/webhook`

### 3. Actualizar variables en Vercel

Agrega estas nuevas variables:

```bash
# Activar funcionalidades
NEXT_PUBLIC_ENABLE_AUTH=true
NEXT_PUBLIC_ENABLE_CHECKOUT=true

# Supabase (completa los valores reales)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 4. Redeploy
```bash
vercel --prod
```

## Monitoreo

### Analytics en Vercel

1. Ve a **Analytics** en el dashboard
2. Revisa métricas de:
   - Visitas
   - Real Experience Score (Web Vitals)
   - Top páginas
   - Errores 4xx/5xx

### Logs

```bash
# Ver logs en tiempo real
vercel logs --follow

# Ver logs de producción
vercel logs --prod
```

## Troubleshooting

### El sitio no carga

1. Verifica que el build fue exitoso en Vercel
2. Revisa logs: `vercel logs --prod`
3. Verifica variables de entorno

### Imágenes no cargan

1. Verifica `next.config.js` tiene los `remotePatterns`
2. Verifica que las URLs de Google Drive son públicas
3. Revisa errores en Network tab del navegador

### Carrito no persiste

- El carrito usa `localStorage` del navegador
- No hay problema del servidor, es comportamiento local

### WhatsApp no abre

1. Verifica `NEXT_PUBLIC_WA_PHONE` tiene formato correcto
2. Número debe incluir código de país sin `+` (ej: `525531033715`)

## Comandos útiles

```bash
# Ver deploys
vercel ls

# Ver detalles de un deploy
vercel inspect [deployment-url]

# Eliminar deployment
vercel rm [deployment-url]

# Ver proyecto actual
vercel

# Promover preview a producción
vercel promote [deployment-url]
```

## Rollback

Si algo sale mal:

1. Ve a Vercel Dashboard → Deployments
2. Encuentra el deployment anterior que funcionaba
3. Click en "..." → **Promote to Production**

## Soporte

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Contacto**: dental.noriega721@gmail.com

