# QA Móvil - DENTAL NORIEGA

## 🎯 Checklist de Verificación

### ✅ **Responsive Layout**
- [ ] Header no tapa contenido en scroll
- [ ] Grids: 1 columna en móvil, 2 en tablet, 3-4 en desktop
- [ ] Imágenes no se estiran ni pixelan
- [ ] Tipografía legible (≥ 14px)
- [ ] Sin scroll horizontal

### ✅ **Burbujas Flotantes**
- [ ] Carrito (azul) y WhatsApp (verde) visibles
- [ ] No tapan contenido importante
- [ ] Respetan safe-area en iOS (notch/home indicator)
- [ ] Se reubican cuando aparece teclado
- [ ] No se superponen entre sí

### ✅ **Drawer del Carrito**
- [ ] Se abre suavemente desde la derecha
- [ ] Bloquea scroll del body mientras está abierto
- [ ] Cierra con:
  - Click en overlay (fondo oscuro)
  - Botón X
  - Tecla Escape
- [ ] Scroll interno funciona en lista de productos
- [ ] Footer del drawer siempre visible

### ✅ **Targets Táctiles**
- [ ] Todos los botones ≥ 44×44px
- [ ] Links en cards clickeables fácilmente
- [ ] Inputs tienen área táctil suficiente
- [ ] Badges no interfieren con clicks

### ✅ **Formularios e Inputs**
- [ ] Buscador: teclado alfanumérico
- [ ] Email: teclado con @ disponible
- [ ] Cantidad: teclado numérico
- [ ] Sin zoom involuntario en iOS (fuente ≥ 16px)
- [ ] Autocomplete habilitado

### ✅ **Performance**
- [ ] Imágenes optimizadas con `sizes` correctos
- [ ] Sin layout shift en carga
- [ ] Scroll suave
- [ ] Transiciones sin lag

---

## 🧪 Herramientas de Prueba

### **1. DevTools - Simulación Móvil**

```bash
1. Abrir Chrome DevTools (F12)
2. Ctrl+Shift+M (Toggle device toolbar)
3. Seleccionar: iPhone 12 Pro (390×844)
4. Navegar por el sitio
```

**Puntos a verificar:**
- Header sticky funciona
- Burbujas no tapan contenido
- Drawer se abre correctamente
- Grid responsive cambia con breakpoints

---

### **2. Página de QA Visual**

```
http://localhost:3000/qa/mobile
```

**Incluye:**
- Checklist completo
- Iframes de preview
- Tips de prueba

---

### **3. Lighthouse Móvil**

#### **Prerequisito:**
```bash
npm install  # Instala lighthouse
```

#### **Ejecutar auditoría:**

**Paso 1:** Iniciar servidor
```bash
npm run dev
```

**Paso 2:** En otra terminal
```bash
npm run lh:mobile
```

**Resultado:**
- Archivo generado: `lighthouse-mobile.json`
- Buscar: `"score"` en cada categoría

#### **Scores objetivo:**
- ✅ Performance: ≥ 90
- ✅ Accessibility: ≥ 90
- ✅ SEO: ≥ 90
- ✅ Best Practices: ≥ 90

#### **Ver resultados:**
```bash
# Linux/Mac
jq '.categories | to_entries[] | {category: .key, score: (.value.score * 100)}' lighthouse-mobile.json

# Windows PowerShell
Get-Content lighthouse-mobile.json | ConvertFrom-Json | Select-Object -ExpandProperty categories
```

---

## 📱 Breakpoints de Tailwind

```css
sm:   640px  → 2 columnas
md:   768px  → Buscador inline
lg:   1024px → 3 columnas
xl:   1280px → 4 columnas
```

---

## 🎨 Safe Area en iOS

El sitio respeta automáticamente:
- **Top:** Notch de iPhone
- **Bottom:** Home indicator

**Variables CSS:**
```css
--safe-t: env(safe-area-inset-top, 0px)
--safe-b: env(safe-area-inset-bottom, 0px)
```

**Uso:**
```html
<main class="pb-safe">  <!-- Padding bottom + safe area -->
```

---

## 🔧 Solución de Problemas Comunes

### **Problema: Burbujas tapan footer**
**Solución:** Componente FAB ajusta automáticamente con safe-area

### **Problema: Drawer no bloquea scroll**
**Solución:** Clase `.body-lock` aplicada automáticamente

### **Problema: Inputs hacen zoom en iOS**
**Solución:** Todos los inputs tienen `font-size: 16px` en globals.css

### **Problema: Imágenes pixeladas**
**Solución:** `sizes` attribute optimizado por breakpoint

### **Problema: Click no responde en móvil**
**Solución:** Todos los targets táctiles ≥ 44px con `.btn` class

---

## 📊 Métricas Actuales

```
✅ Responsive: 5 breakpoints
✅ Safe area: Respetada
✅ Targets táctiles: ≥ 44px
✅ Inputs: Font 16px (sin zoom)
✅ Drawer: Accesible (Escape + overlay)
✅ Burbujas: Posicionamiento inteligente
```

---

## 🚀 Comandos Rápidos

```bash
# Desarrollo
npm run dev

# Lighthouse móvil (en otra terminal)
npm run lh:mobile

# Ver página de QA
open http://localhost:3000/qa/mobile
```

---

## ✅ Tests Manuales en Móvil Real

1. **Abrir en iPhone/Android:** Usa la IP local (ej: `http://192.168.1.100:3000`)
2. **Navegar por catálogo:** Verificar que las cards sean legibles
3. **Agregar al carrito:** Verificar que el drawer funcione
4. **Abrir teclado:** Verificar que burbujas no estorben
5. **Scroll:** Verificar que sea suave

---

## 📝 Notas para Desarrolladores

- **No modificar** `globals.css` sin probar en móvil
- **Siempre** usar `.btn` class para botones
- **Usar** `min-h-[44px]` en elementos clickeables
- **Probar** con `npm run lh:mobile` antes de deploy
- **Verificar** `/qa/mobile` tras cambios en UI

---

**Última actualización:** Octubre 2025

