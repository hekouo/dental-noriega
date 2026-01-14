# Iconos PWA - Placeholders

Los iconos PWA (`icon-192.png` y `icon-512.png`) son requeridos para que la PWA sea instalable.

## Estado actual

**⚠️ Estos archivos NO están incluidos en este PR.** Son placeholders que deben crearse antes de activar la PWA en producción.

## Requisitos

- `icon-192.png`: 192x192px, formato PNG
- `icon-512.png`: 512x512px, formato PNG
- Ambos deben ser "maskable" (con padding seguro de ~20% desde los bordes)
- Usar el logo/brand de Depósito Dental Noriega

## Cómo crear los iconos

1. Usar el logo existente (`public/favicon.ico` o assets de marca)
2. Generar versiones a 192x192 y 512x512px
3. Asegurar que el contenido importante esté dentro del "safe area" (centro 80% del icono)
4. Guardar como `public/icon-192.png` y `public/icon-512.png`

## Herramientas recomendadas

- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- Diseño manual con Figma/Photoshop

## Nota

El manifest ya referencia estos iconos. Si no existen cuando se activa la PWA, el navegador mostrará un error en la consola, pero la PWA seguirá funcionando (solo sin icono personalizado).
