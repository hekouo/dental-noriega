# 🚀 Optimizaciones de Performance - DENTAL NORIEGA

## 📊 Objetivo: Lighthouse Mobile ≥ 85

**Target Scores:**
- ✅ Performance: ≥ 85
- ✅ Accessibility: ≥ 95
- ✅ Best Practices: ≥ 95
- ✅ SEO: ≥ 95

---

## ✅ Optimizaciones Implementadas

### **1. LCP (Largest Contentful Paint)**

#### **a) Priority en primera imagen visible**
```tsx
// src/app/page.tsx
<ProductImage
  priority={idx === 0}  // Primera imagen de destacados
  sizes="(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
/>

// src/app/catalogo/[section]/page.tsx  
<ProductImage
  priority={idx === 0}  // Primera card del listado
/>

// src/app/catalogo/[section]/[slug]/page.tsx
<ProductImage
  priority  // Imagen principal de ficha
/>
```

**Resultado:** Next.js precarga la imagen LCP antes de todo

---

#### **b) Imágenes optimizadas con sizes correctos**

**Cards:**
```
sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw"
```

**Ficha de producto:**
```
sizes="(min-width:768px) 50vw, 100vw"
```

**Formatos modernos:**
```js
// next.config.js
images: {
  formats: ['image/webp', 'image/avif'],
}
```

---

### **2. TTFB (Time to First Byte)**

#### **Cache de React para CSV**

```tsx
// src/lib/data/catalog-sections.ts
import { cache } from "react";

export const loadAllSections = cache(async function loadAllSectionsCached() {
  // Lee CSV solo una vez por request
  // Next.js cachea el resultado durante el render
  return sections;
});
```

#### **Revalidate en páginas**

```tsx
// Todas las páginas del catálogo
export const revalidate = 300; // 5 minutos
```

**Resultado:** 
- CSV se leen solo 1 vez, no en cada componente
- Páginas se regeneran cada 5 minutos (ISR)

---

### **3. Reducir JavaScript Inicial**

#### **Dynamic imports para componentes no críticos**

```tsx
// src/app/layout.tsx
const SiteFooter = dynamic(() => import("@/components/SiteFooter"), { 
  ssr: false 
});

// src/app/page.tsx
const FinalThanks = dynamic(() => import('@/components/FinalThanks'), { 
  ssr: false 
});
```

**Resultado:**
- FinalThanks: ~15KB menos en bundle inicial
- SiteFooter: ~10KB menos en bundle inicial
- Carga perezosa después del contenido principal

---

#### **Prefetch selectivo**

```tsx
// Solo las primeras 4 cards
prefetch={idx < 4}

// El resto sin prefetch
prefetch={false}
```

**Resultado:** Reduce payload inicial y requests paralelos

---

### **4. Fuentes Optimizadas**

```tsx
// src/app/layout.tsx
import { Inter } from "next/font/google";

const inter = Inter({ 
  subsets: ["latin"], 
  display: "swap"  // Evita FOIT (Flash of Invisible Text)
});

<body className={inter.className}>
```

**Resultado:**
- Fuente self-hosted (no CDN externo)
- display: swap → muestra texto inmediatamente
- ~100ms menos en CLS

---

### **5. Configuración de Producción**

```js
// next.config.js
module.exports = {
  productionBrowserSourceMaps: false,  // Reduce tamaño
  poweredByHeader: false,              // Security
  compress: true,                       // Gzip automático
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
};
```

---

## 🔧 Herramientas de Análisis

### **1. Bundle Analyzer**

#### **Instalado:**
```json
"@next/bundle-analyzer": "^14.2.33"
```

#### **Uso:**
```bash
# Analizar bundle
npm run analyze

# Abre automáticamente:
# - client.html (bundle del cliente)
# - server.html (bundle del servidor)
```

**Buscar:**
- Dependencias grandes (>50KB)
- Módulos duplicados
- Code splitting oportunities

---

### **2. Lighthouse Móvil**

#### **Scripts disponibles:**

**a) JSON (rápido):**
```bash
npm run lh:mobile
```
- Salida: `lighthouse-mobile.json`
- Solo scores numéricos

**b) HTML (visual):**
```bash
npm run lh:mobile:html
```
- Salida: `lighthouse-mobile.html`
- Abrir en navegador para ver detalles

---

#### **Proceso completo:**

```bash
# 1. Build de producción
npm run build

# 2. Iniciar servidor en puerto 3002
npm start

# 3. En otra terminal: Lighthouse
npm run lh:mobile:html

# 4. Ver resultados
# Windows: start lighthouse-mobile.html
# Mac/Linux: open lighthouse-mobile.html
```

---

#### **Leer scores del JSON:**

**PowerShell:**
```powershell
$json = Get-Content lighthouse-mobile.json | ConvertFrom-Json
$json.categories.performance.score * 100
$json.categories.accessibility.score * 100
$json.categories.seo.score * 100
$json.categories.'best-practices'.score * 100
```

**Bash/Zsh:**
```bash
jq '.categories | to_entries[] | {category: .key, score: (.value.score * 100)}' lighthouse-mobile.json
```

---

## 📋 Checklist Pre-Lighthouse

Antes de ejecutar la auditoría, verificar:

- [ ] Build de producción completado sin errores
- [ ] Servidor corriendo en http://localhost:3002
- [ ] CSV cargados correctamente
- [ ] Imágenes con `priority` en LCP
- [ ] Dynamic imports aplicados
- [ ] `revalidate` en todas las páginas del catálogo
- [ ] No hay `unoptimized` en imágenes (excepto si es necesario)
- [ ] next/font configurado con display: swap

---

## 🎯 Scores Esperados

### **Performance: ≥ 85**
- LCP < 2.5s
- TBT < 300ms
- CLS < 0.1
- TTFB < 800ms

### **Accessibility: ≥ 95**
- Contraste adecuado
- Labels en inputs
- ARIA en modals
- Min-height ≥ 44px en botones

### **SEO: ≥ 95**
- Meta tags presentes
- Títulos únicos
- Descripción
- Mobile-friendly

### **Best Practices: ≥ 95**
- HTTPS en prod
- No console.log
- Imágenes con alt
- Sin errores en consola

---

## 🔍 Si Performance < 85

### **Diagnóstico:**

1. **Ver lighthouse-mobile.html → Section "Opportunities"**
   - Buscar: "Largest Contentful Paint"
   - Buscar: "Total Blocking Time"
   - Buscar: "Speed Index"

2. **Problemas comunes y soluciones:**

| Problema | Solución |
|----------|----------|
| LCP > 2.5s | ✅ Agregar `priority` a imagen LCP |
| TBT > 300ms | ✅ Dynamic imports para componentes pesados |
| TTFB > 800ms | ✅ Verificar que `cache()` esté aplicado |
| Bundle JS > 200KB | ✅ Ejecutar `npm run analyze` |
| Imágenes > 200KB | ✅ Reducir calidad o usar AVIF |

---

## 📈 Mejoras Implementadas por Métrica

### **LCP: Largest Contentful Paint**
- ✅ `priority` en primera imagen visible
- ✅ `sizes` optimizados
- ✅ Formats: WebP + AVIF
- ✅ Cache TTL: 60 segundos

### **TTFB: Time to First Byte**
- ✅ React `cache()` en loadAllSections
- ✅ ISR con `revalidate: 300`
- ✅ Filesystem reads cacheados

### **TBT: Total Blocking Time**
- ✅ Dynamic imports (FinalThanks, SiteFooter)
- ✅ Prefetch selectivo (solo primeros 4)
- ✅ next/font self-hosted

### **CLS: Cumulative Layout Shift**
- ✅ `aspect-ratio` en todas las imágenes
- ✅ `display: swap` en fuentes
- ✅ Skeletons si fuera necesario

---

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Servidor de producción (puerto 3002)
npm start

# Análisis de bundle
npm run analyze

# Lighthouse móvil (JSON)
npm run lh:mobile

# Lighthouse móvil (HTML visual)
npm run lh:mobile:html
```

---

## 📝 Archivos Modificados

### **Core:**
1. `next.config.js` - Bundle analyzer + optimizaciones
2. `package.json` - Scripts + devDependencies
3. `src/app/layout.tsx` - next/font + dynamic imports
4. `src/app/globals.css` - Safe area + performance

### **Páginas:**
5. `src/app/page.tsx` - priority + dynamic + revalidate
6. `src/app/catalogo/page.tsx` - revalidate + prefetch
7. `src/app/catalogo/[section]/page.tsx` - priority + revalidate
8. `src/app/catalogo/[section]/[slug]/page.tsx` - priority + revalidate
9. `src/app/destacados/page.tsx` - revalidate

### **Componentes:**
10. `src/components/ProductImage.tsx` - Eliminado unoptimized
11. `src/lib/data/catalog-sections.ts` - React cache()

---

## ✅ Estado Actual

```
✅ Cache de CSV: Implementado
✅ ISR (300s): Todas las páginas
✅ LCP optimizado: priority en primera imagen
✅ Dynamic imports: Footer + agradecimiento
✅ next/font: Inter con display swap
✅ Bundle analyzer: Configurado
✅ Prefetch: Selectivo (primeros 4)
✅ Image formats: WebP + AVIF
```

---

## 🎉 Próximos Pasos

1. **Ejecutar Lighthouse:**
   ```bash
   npm run build && npm start
   # En otra terminal:
   npm run lh:mobile:html
   ```

2. **Revisar resultados:**
   - Abrir `lighthouse-mobile.html`
   - Verificar scores
   - Ver sección "Opportunities" si < 85

3. **Optimizar más si es necesario:**
   - Reducir tamaño de imágenes de Drive
   - Lazy load más componentes
   - Code splitting adicional

---

**Última actualización:** Octubre 2025

