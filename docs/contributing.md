# Contributing Guide

## Flujo de Pull Request

### 1. Preparación
- Fork del repositorio
- Crear rama desde `main`: `git checkout -b feature/nueva-funcionalidad`
- Instalar dependencias: `pnpm install`

### 2. Desarrollo
- Seguir convenciones de commits (ver sección Commits)
- Ejecutar verificaciones locales:
  ```bash
  pnpm verify    # Verificación completa
  pnpm size      # Verificar tamaño de bundles
  pnpm test:e2e  # Tests e2e (opcional)
  ```

### 3. Commit
- Usar formato convencional: `type(scope): description`
- Ejemplos:
  - `feat(auth): add login functionality`
  - `fix(ui): resolve button alignment issue`
  - `docs(readme): update installation steps`

### 4. Pull Request
- Crear PR con descripción clara
- Añadir screenshots si hay cambios de UI
- Esperar review y CI checks

## Convenciones de Commits

### Tipos permitidos:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bugs
- `docs`: Documentación
- `style`: Formato, espacios, etc.
- `refactor`: Refactoring sin cambios funcionales
- `perf`: Mejoras de rendimiento
- `test`: Tests
- `chore`: Tareas de mantenimiento
- `ci`: Cambios en CI/CD
- `build`: Cambios en build system
- `revert`: Revertir commits

### Ejemplos:
```
feat(auth): add OAuth2 login
fix(api): handle null response in user endpoint
docs(readme): add deployment instructions
chore(deps): update dependencies
```

## Scripts Disponibles

### Verificación
- `pnpm verify` - Verificación completa (clean, typecheck, lint, build)
- `pnpm typecheck` - Verificación de tipos TypeScript
- `pnpm lint` - Linting con ESLint
- `pnpm build` - Build de producción

### Análisis
- `pnpm size` - Verificar tamaño de bundles
- `pnpm analyze` - Análisis de bundles con visualización
- `pnpm dead:exports` - Buscar exports no utilizados
- `pnpm deps:check` - Verificar dependencias huérfanas

### Testing
- `pnpm test:e2e` - Tests e2e con Playwright
- `pnpm e2e:ci` - Tests e2e para CI
- `pnpm lh:ci` - Lighthouse CI (performance)

### Mantenimiento
- `pnpm doctor` - Verificar estado del proyecto
- `pnpm audit` - Auditoría de seguridad
- `pnpm clean` - Limpiar cachés

## Estándares de Código

### TypeScript
- Usar tipos estrictos
- Evitar `any`
- Preferir interfaces sobre types para objetos
- Usar `@/` para imports absolutos

### React
- Preferir Server Components cuando sea posible
- Usar `"use client"` solo cuando sea necesario
- Seguir patrones de Next.js 14

### Estilos
- Usar Tailwind CSS
- Seguir design system establecido
- Responsive design por defecto

## Review Process

1. **Automático**: CI checks (typecheck, lint, build, tests)
2. **Manual**: Review de código por parte del equipo
3. **Aprobación**: Al menos 1 review aprobado
4. **Merge**: Solo después de todos los checks

## Troubleshooting

### Errores comunes:
- **TypeScript errors**: Ejecutar `pnpm typecheck`
- **Lint errors**: Ejecutar `pnpm lint --fix`
- **Build errors**: Verificar imports y dependencias
- **Test failures**: Revisar tests y datos de prueba

### Recursos:
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Interpretación de Verificaciones

### Size-Limit
- **Qué es**: Verifica que los bundles no excedan límites de tamaño
- **Límites actuales**: JS 250KB, CSS 80KB
- **Qué hacer si falla**: 
  1. Revisar imports innecesarios
  2. Usar `next/dynamic` para componentes pesados
  3. Optimizar imágenes y assets
  4. Considerar code splitting

### Gitleaks (Secret Scanning)
- **Qué es**: Escanea el código en busca de secretos expuestos
- **Qué hacer si encuentra algo**:
  1. **NO** hacer commit del fix
  2. Rotar/revocar el secreto inmediatamente
  3. Verificar si es falso positivo en `.gitleaks.toml`
  4. Añadir a allowlist si es necesario
  5. Hacer commit del fix

### Modo Estricto de Limpieza
- **Cómo activar**: Crear archivo `.ci/strict-cleanup.enabled` (vacío)
- **Qué hace**: Cambia de modo "aviso" a modo "bloqueo" para:
  - Exports no utilizados (`ts-prune`)
  - Dependencias huérfanas (`depcheck`)
- **Cuándo activar**: Después de la primera pasada de limpieza

## Verificaciones Automáticas

| Check | PR | Main | Artifacts |
|-------|----|----|-----------|
| TypeScript | ❌ Falla | ✅ Aviso | - |
| Linting | ❌ Falla | ✅ Aviso | - |
| Build | ❌ Falla | ✅ Aviso | - |
| Bundle Size | ❌ Falla | ✅ Aviso | size-limit.json |
| Secret Scanning | ❌ Falla | ✅ Issue | gitleaks.sarif |
| Dead Exports | ⚠️ Soft | ⚠️ Soft | cleanup-report |
| Dependencies | ⚠️ Soft | ⚠️ Soft | cleanup-report |
| Licenses | ✅ Info | ✅ Info | licenses.csv/json |
| E2E Tests | ✅ Info | ✅ Info | playwright-report |
| Lighthouse | ✅ Info | ✅ Info | lhci-reports |

**Leyenda:**
- ❌ Falla: Bloquea el merge
- ⚠️ Soft: Solo aviso (primera vez)
- ✅ Info: Solo información

## Guías de Troubleshooting

### Size-limit: Cómo Actuar
- **Qué es**: Verifica que los bundles no excedan límites de tamaño
- **Límites actuales**: JS 250KB, CSS 80KB
- **Qué hacer si falla**: 
  1. Revisar imports innecesarios
  2. Usar `next/dynamic` para componentes pesados
  3. Optimizar imágenes y assets
  4. Considerar code splitting
  5. Ejecutar `pnpm analyze` para visualizar el bundle

### Gitleaks: False Positives y Rotación de Claves
- **Qué es**: Escanea el código en busca de secretos expuestos
- **Qué hacer si encuentra algo**:
  1. **NO** hacer commit del fix
  2. Rotar/revocar el secreto inmediatamente
  3. Verificar si es falso positivo en `.gitleaks.toml`
  4. Añadir a allowlist si es necesario
  5. Hacer commit del fix
- **False positives comunes**: 
  - Ejemplos en documentación
  - Tests con datos mock
  - Variables de entorno de ejemplo

### Modo Estricto Activable por Marcadores
- **`.ci/licenses.strict`**: Activa verificación estricta de licencias
- **`.ci/strict-cleanup.enabled`**: Activa limpieza estricta de exports/deps
- **Cómo activar**: Crear archivo vacío en la raíz del proyecto
- **Cuándo activar**: Después de la primera pasada de limpieza

## Verificaciones Automáticas

| Check | PR | Main | Artifacts |
|-------|----|----|-----------|
| TypeScript | ❌ Falla | ✅ Aviso | - |
| Linting | ❌ Falla | ✅ Aviso | - |
| Build | ❌ Falla | ✅ Aviso | - |
| Bundle Size | ❌ Falla | ✅ Aviso | size-limit.json |
| Secret Scanning | ❌ Falla | ✅ Issue | gitleaks.sarif |
| Dead Exports | ⚠️ Soft | ⚠️ Soft | cleanup-report |
| Dependencies | ⚠️ Soft | ⚠️ Soft | cleanup-report |
| Licenses | ✅ Info | ✅ Info | licenses.csv/json |
| E2E Tests | ✅ Info | ✅ Info | playwright-report |
| Lighthouse | ✅ Info | ✅ Info | lhci-reports |
| Lockfile Lint | ❌ Falla | ✅ Aviso | - |
| Spell Check | ❌ Falla | ✅ Aviso | - |

**Leyenda:**
- ❌ Falla: Bloquea el merge
- ⚠️ Soft: Solo aviso (primera vez)
- ✅ Info: Solo información
