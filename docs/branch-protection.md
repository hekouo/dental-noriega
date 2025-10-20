# Branch Protection Rules

## Configuración Requerida

Para activar la protección de ramas en este repositorio, sigue estos pasos:

### 1. Ir a Settings > Branches
- Navega a: `https://github.com/[OWNER]/[REPO]/settings/branches`

### 2. Añadir regla para `main`
- Click en "Add rule"
- Branch name pattern: `main`

### 3. Configurar protecciones
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `1`
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Status checks requeridos:
    - `CI` (GitHub Actions)
    - `typecheck` (si está disponible)
    - `lint` (si está disponible)
    - `build` (si está disponible)
    - `test` (si está disponible)

- ✅ **Require conversation resolution before merging**

- ✅ **Restrict pushes that create files larger than 100 MB**

### 4. Aplicar configuración
- Click en "Create" para aplicar las reglas

## Checklist de Activación

- [ ] Regla de branch protection creada para `main`
- [ ] PRs requeridos antes de merge
- [ ] Al menos 1 review requerido
- [ ] Status checks configurados
- [ ] Push directo a main bloqueado
- [ ] CODEOWNERS configurado (ver .github/CODEOWNERS)

## Notas

- Estas reglas solo se pueden activar manualmente por el owner del repo
- Los status checks aparecerán automáticamente cuando se ejecute el CI
- Asegúrate de que el equipo tenga permisos de review apropiados

- ✅ **Require linear history** (evita merge commits)
- ✅ **Auto-delete branches** (limpia ramas merged)
