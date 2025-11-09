# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased]

### Performance
- **feat(perf):** Optimización de imágenes LCP con prioridad y formatos AVIF/WebP (#77)
- **feat(perf):** Fuentes con next/font + preconnect/preload y headers de caché (#78)
- **feat(perf):** CSS crítico inline y defer de CSS no crítico (#78)
- **feat(perf):** Store de Zustand optimizado con rehidratación diferida (#78)
- **feat(perf):** Controles lazy con IntersectionObserver + requestIdleCallback (#78)
- **feat(perf):** Preload hero image con fetchPriority="high" (#78)
- **feat(perf):** Purga de Tailwind optimizada (#78)
- **feat(perf):** Defer de más componentes (#83)
- **feat(perf):** Final tuning para imágenes optimizadas (#84)
- **feat(perf):** Quick wins adicionales de performance (#81)

### Accesibilidad
- **chore(a11y):** Labels accesibles, enlaces descriptivos y contraste AA (#79)

### Mejoras
- Performance mejorado de ~75-80 a 99 (+19-24 puntos)
- LCP mejorado de ~3.0s a 1.5-1.6s (-1.4s)
- TBT mejorado de ~1000ms a 70-280ms (-720-930ms)
- FCP mejorado de ~1.5s a 1.0s (-0.5s)
- CSS inicial reducido de ~40-50 KB a 35.7 KB (-4-14 KB)
- Axe: 0 violaciones en todas las rutas
- Redirects: 0 al cargar `/`

## [2025-11-09]

### Performance
- CSS crítico inline implementado para above-the-fold
- Script inline para diferir CSS no crítico antes del parse
- Optimización de rehidratación del store de Zustand
- Lazy loading mejorado con IntersectionObserver + requestIdleCallback

### Accesibilidad
- Mejoras de contraste AA
- Labels accesibles implementados
- Enlaces descriptivos mejorados

## [2025-11-07]

### Performance
- Prioridad LCP en imágenes hero
- Formatos AVIF/WebP optimizados
- Sizes correctos para responsive images
- Defer de componentes adicionales
- Final tuning de imágenes optimizadas

