# QA rápido: SEO / Performance / Accesibilidad

## Cómo correr

### Lighthouse (requiere URL pública o local):

```bash
AUDIT_URL="https://<tu-deploy>.vercel.app" pnpm audit:lh
```

### Axe + Playwright (usa la misma AUDIT_URL o NEXT_PUBLIC_SITE_URL; si no, intenta localhost:3000):

```bash
AUDIT_URL="https://<tu-deploy>.vercel.app" pnpm audit:axe
```

## Dónde ver reportes

- **Lighthouse**: `reports/lighthouse/*.html` y `.json`
- **Axe**: `reports/axe/*.json`

## Umbrales (Actualizados - Nov 2025)

- **Performance** ≥ 0.80 (objetivo: ≥0.90)
- **Accessibility** ≥ 0.90
- **Best Practices** ≥ 0.90
- **SEO** ≥ 0.90
- **Axe**: ≤ 10 violaciones por página (objetivo: 0)
- **LCP**: < 2.5s (objetivo: < 2.0s)
- **TBT**: < 300ms (objetivo: < 200ms)
- **FCP**: < 1.8s (objetivo: < 1.5s)
- **CSS inicial**: ≤ 40 KB (objetivo: ≤ 35 KB)
- **Redirects**: 0-1 máximo al cargar `/`

## Páginas incluidas

- `/`, `/destacados`, `/tienda`, `/buscar?q=arco`, `/checkout/datos`

## Tips

- Corre `audit:lh` sobre **producción** (https://dental-noriega.vercel.app) para métricas reales en CDN.
- Las previews de Vercel pueden tener redirects SSO que no ocurren en producción.
- Repite después de cambios de imágenes, layout o CSS.
- Verifica que `trailingSlash: false` esté aplicado en `next.config.mjs`.
- Confirma que la purga de Tailwind esté activa (CSS inicial ≤ 40 KB).

## Estado Actual (Post-Optimización)

**Performance:** 94-99  
**Accessibility:** 96  
**Best Practices:** 96  
**SEO:** 100  
**Axe:** 0 violaciones  
**LCP:** 1.5-1.6s  
**TBT:** 70-280ms  
**CSS inicial:** 35.7 KB
