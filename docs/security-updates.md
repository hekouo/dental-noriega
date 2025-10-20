# Security Updates

## Configuración de Seguridad

Este repositorio usa **Renovate** como fuente principal para actualizaciones de dependencias.

### Renovate (Actualizaciones de Versiones)
- Maneja actualizaciones automáticas de dependencias
- Configurado en `renovate.json`
- Crea PRs automáticos con actualizaciones

### Dependabot (Solo Alertas de Seguridad)
- Solo maneja alertas de seguridad
- No crea PRs de actualización (evita conflictos con Renovate)
- Configurado en `.github/dependabot.yml` (eco vacío)

## Activación Manual Requerida

### 1. GitHub Security Alerts
- Ve a: Settings > Security & analysis
- Activa: "Dependabot alerts"
- Activa: "Dependabot security updates"

### 2. Renovate Bot
- Ve a: https://github.com/apps/renovate
- Instala en el repositorio
- Renovate comenzará a crear PRs automáticamente

## Flujo de Trabajo

1. **Renovate** crea PRs para actualizaciones de versiones
2. **Dependabot** envía alertas de seguridad
3. **Equipo** revisa y mergea PRs según políticas
4. **CI/CD** verifica que todo funcione correctamente

## Notas

- No activar "Dependabot version updates" para evitar conflictos
- Renovate es más configurable y flexible
- Las alertas de seguridad son críticas y deben atenderse rápidamente
