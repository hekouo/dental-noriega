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

## Umbrales (MVP)

- **Perf** ≥ 0.75, **A11y** ≥ 0.90, **Best Practices** ≥ 0.90, **SEO** ≥ 0.90 (solo warnings)
- **Axe**: < 10 violaciones por página (temporal)

## Páginas incluidas

- `/`, `/destacados`, `/tienda`, `/buscar?q=arco`, `/checkout/datos`

## Tips

- Corre `audit:lh` sobre previsualización de Vercel (Preview URL) para métricas reales en CDN.
- Repite después de cambios de imágenes o layout.
