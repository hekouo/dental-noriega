# Workaround: EPERM .next/trace en Windows

Cuando `pnpm -s verify` o `pnpm run build` fallan en Windows con:

```
EPERM: operation not permitted, open '.next\trace'
```

la carpeta `.next` (o el archivo `trace`) queda bloqueada por otro proceso.

## Pasos recomendados

1. **Cerrar procesos Node**
   - Abre el Administrador de tareas y finaliza todos los procesos `Node.js`.
   - O en CMD/PowerShell: `taskkill /F /IM node.exe`

2. **Ejecutar clean antes de verify**
   - `pnpm clean:next` (borra `.next` con reintentos).
   - Luego: `pnpm -s verify`.

3. **Cerrar Explorer / OneDrive**
   - Si tienes la carpeta del proyecto abierta en el Explorador de archivos, ciérrala.
   - Si el repo está en una carpeta sincronizada con OneDrive, la sincronización puede bloquear archivos. Mueve el repo fuera de OneDrive o pausa la sincronización.

4. **Excluir la carpeta del proyecto en Windows Defender** (opcional)
   - Configuración → Privacidad y seguridad → Seguridad de Windows → Protección contra virus y amenazas → Configuración → Exclusiones.
   - Añade la carpeta del proyecto para reducir bloqueos durante el build.

5. **Evitar OneDrive en la carpeta del repo**
   - Clonar o trabajar en una ruta que no esté bajo OneDrive (por ejemplo `C:\dev\proyecto` en lugar de `C:\Users\...\OneDrive\...`).

## Comando verify

El script `verify` ya ejecuta `clean:next` antes de `tsc`, `lint` y `build`. Si aun así falla, ejecuta manualmente `pnpm clean:next` y vuelve a lanzar `pnpm -s verify`.
