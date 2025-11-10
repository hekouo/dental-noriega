# QA rápido: SEO / Performance / Accesibilidad

## Cómo correr

### Workflow de GitHub Actions (recomendado)

El audit se ejecuta manualmente desde GitHub Actions:

1. Ve a [Actions → Audit (Lighthouse + Axe)](https://github.com/hekouo/dental-noriega/actions/workflows/audit.yml)
2. Haz clic en "Run workflow"
3. Ingresa la URL a auditar (por defecto: `https://dental-noriega.vercel.app`)
4. Los artifacts se guardan automáticamente con retención de 14 días

**Nota:** El audit también se ejecuta automáticamente cada lunes a las 09:00 UTC.

### Local (desarrollo)

#### Lighthouse (requiere URL pública o local):

```bash
AUDIT_URL="https://<tu-deploy>.vercel.app" pnpm audit:lh
```

#### Axe + Playwright (usa la misma AUDIT_URL o NEXT_PUBLIC_SITE_URL; si no, intenta localhost:3000):

```bash
AUDIT_URL="https://<tu-deploy>.vercel.app" pnpm audit:axe
```

## Dónde ver reportes

- **Lighthouse**: `reports/lighthouse/*.html` y `.json`
- **Axe**: `reports/axe/*.json`
- **Artifacts archivados**: `docs/audits/2025-11-10/` (auditoría final)

## Umbrales (MVP)

- **Perf** ≥ 0.75, **A11y** ≥ 0.90, **Best Practices** ≥ 0.90, **SEO** ≥ 0.90 (solo warnings)
- **Axe**: < 10 violaciones por página (temporal)

## Páginas incluidas

- `/`, `/destacados`, `/tienda`, `/buscar?q=arco`, `/checkout/datos`

## Tips

- Corre `audit:lh` sobre previsualización de Vercel (Preview URL) para métricas reales en CDN.
- Repite después de cambios de imágenes o layout.

## Estado Actual (Post-Optimización - 2025-11-10)

**Performance:** 100 (producción)  
**Accessibility:** 96  
**Best Practices:** 96  
**SEO:** 100  
**Axe:** 0 violaciones  
**LCP:** 1.8s  
**TBT:** 50ms  
**FCP:** 1.0s  
**CSS inicial:** 36.0 KB

### Última Auditoría

- **Fecha:** 2025-11-10 00:54 UTC
- **URL:** https://dental-noriega.vercel.app
- **Artifacts:**
  - `docs/audits/2025-11-10/lighthouse.json`
  - `docs/audits/2025-11-10/lighthouse.html`
- **Release:** [v1.0.0](https://github.com/hekouo/dental-noriega/releases/tag/v1.0.0)
- **PR Meta:** [#92](https://github.com/hekouo/dental-noriega/pull/92)
