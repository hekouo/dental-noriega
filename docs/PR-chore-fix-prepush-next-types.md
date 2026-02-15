# chore: fix pre-push failing on .next/types

## Objetivo

Arreglar el fallo del hook pre-push (husky) que bloqueaba `git push` con errores TS2307 en `.next/types/app/api/stripe/receipt/route.ts`.

## Causa del fallo

1. **tsconfig.json** incluye `".next/types/**/*.ts"` en `include`, para que TypeScript reconozca los tipos generados por Next.js de las rutas API.
2. **`.next/types`** se genera durante `next build` y contiene shims que importan cada ruta real (ej. `../../../../../../src/app/api/stripe/receipt/route.js`).
3. Si una ruta fue eliminada o nunca existió, el directorio `.next` de un build anterior puede contener **shims obsoletos** que apuntan a archivos inexistentes.
4. El comando `pnpm verify` ejecuta `pnpm tsc && pnpm lint && pnpm build`; `tsc` se ejecuta primero e intenta compilar esos shims obsoletos, provocando TS2307.

En este caso, existía `.next/types/app/api/stripe/receipt/route.ts` (ruta fantasma/obsoleta), pero no existe `src/app/api/stripe/receipt/route.ts` (solo existen `create-payment-intent` y `webhook`).

## Reproducción

```bash
# 1. Tener .next de un build anterior con shims obsoletos
pnpm build   # genera .next/types

# 2. Eliminar o no crear una ruta que Next.js había tipado
# (o clonar repo donde .next/types ya tiene referencias rotas)

# 3. Ejecutar el mismo flujo que el pre-push
pnpm verify
# Error: .next/types/app/api/stripe/receipt/route.ts(2,24): error TS2307:
# Cannot find module '../../../../../../src/app/api/stripe/receipt/route.js'
```

## Solución

**Quitar `.next/types/**/*.ts` del `include` de tsconfig.json.**

- `pnpm tsc` (ejecutado en `verify`) ahora solo verifica `src/`, `scripts/`, `next.config.mjs`, etc., sin incluir los shims generados.
- `next build` sigue generando y validando los tipos de rutas; su type-check no depende del `include` de nuestro tsconfig base.
- Evita que shims obsoletos en `.next/types` hagan fallar `tsc` cuando las rutas reales no coinciden.

## Archivos tocados

- `tsconfig.json`: eliminado `".next/types/**/*.ts"` del array `include`.

## Prohibido (respetado)

- No se tocó: Home, checkout, admin, shipping.
- Solo tooling/ignore/fix de tipos.
