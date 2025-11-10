# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.1.0] - 2025-11-10

### Repo Hardened: CI/Audit Weekly, Husky, Templates, Branch Protection

Este release marca la finalización del sprint de endurecimiento del repositorio, mejorando la calidad del código, automatización y protección de branches.

**Métricas y Runs:**

- **CI Run #88**: [success](https://github.com/hekouo/dental-noriega/actions/runs/19223898116)
- **Audit Run #63**: [failure](https://github.com/hekouo/dental-noriega/actions/runs/19223902450) (timeout/red esperado)

### Cambios Clave

- **CI/CD:**
  - Audit automático semanal (lunes 09:00 UTC)
  - Artifacts con retención de 14 días
  - Husky pre-commit hook configurado
  - Lint-staged con eslint + prettier

- **Templates y Documentación:**
  - Pull request template con checklist
  - Issue templates para bugs y features
  - README actualizado con sección de branch protection

- **Branch Protection:**
  - Required checks: `build`
  - Require PR before merging: ON
  - Require conversation resolution: ON
  - Require linear history: ON
  - Allow force pushes: OFF
  - Allow deletions: OFF

- **Calidad de Código:**
  - Eliminación de `any` en rutas API y componentes
  - Helpers movidos fuera de páginas para fast refresh
  - TypeScript estricto en todos los archivos

**Enlaces:**
- [Release v1.1.0](https://github.com/hekouo/dental-noriega/releases/tag/v1.1.0)
- [PR #98](https://github.com/hekouo/dental-noriega/pull/98) - Templates + Husky
- [PR #100](https://github.com/hekouo/dental-noriega/pull/100) - Audit cron + retention

## [1.0.0] - 2025-11-10

### 🎉 Release: Audit Complete

**Performance alcanzó 100** - el máximo posible en Lighthouse. Todas las métricas cumplen o superan los objetivos establecidos.

### Auditoría Final

- **Performance**: 100 (objetivo ≥0.80) ✅
- **Accessibility**: 96 (objetivo ≥0.90) ✅
- **Best Practices**: 96 (objetivo ≥0.90) ✅
- **SEO**: 100 (objetivo ≥0.90) ✅
- **LCP**: 1.8s (objetivo <2.5s) ✅
- **TBT**: 50ms (objetivo <300ms) ✅
- **FCP**: 1.0s (objetivo <1.8s) ✅
- **Axe**: 0 violaciones en todas las rutas ✅
- **CSS inicial**: 36.0 KB (objetivo ≤40 KB) ✅

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
- **chore(perf):** Housekeeping post-audit: headers duplicados eliminados, trailingSlash: false, lucide-react reemplazado con SVG inline (#93)

### Accesibilidad

- **chore(a11y):** Labels accesibles, enlaces descriptivos y contraste AA (#79, #93)

### Mejoras

- Performance mejorado de ~75-80 a 100 (+20-25 puntos)
- LCP mejorado de ~3.0s a 1.8s (-1.2s)
- TBT mejorado de ~1000ms a 50ms (-950ms)
- FCP mejorado de ~1.5s a 1.0s (-0.5s)
- CSS inicial reducido de ~40-50 KB a 36.0 KB (-4-14 KB)
- Axe: 0 violaciones en todas las rutas
- Redirects: 0 al cargar `/`

### Artifacts y Documentación

- Artifacts de auditoría archivados en `docs/audits/2025-11-10/`
- PR Meta: [#92](https://github.com/hekouo/dental-noriega/pull/92)
- Release: [v1.0.0](https://github.com/hekouo/dental-noriega/releases/tag/v1.0.0)

## [Unreleased]

### Performance

- CSS crítico inline implementado para above-the-fold
- Script inline para diferir CSS no crítico antes del parse
- Optimización de rehidratación del store de Zustand
- Lazy loading mejorado con IntersectionObserver + requestIdleCallback

### Accesibilidad

- Mejoras de contraste AA
- Labels accesibles implementados
- Enlaces descriptivos mejorados

## [2025-11-09]

### Performance

- Prioridad LCP en imágenes hero
- Formatos AVIF/WebP optimizados
- Sizes correctos para responsive images
- Defer de componentes adicionales
- Final tuning de imágenes optimizadas
