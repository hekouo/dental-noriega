# PowerShell 7 - Guía de Reparación Manual

## ✅ Estado Actual

**Perfil reparado exitosamente:**

- ✓ Perfil limpio creado en: `C:\Users\Smurf\OneDrive\Documentos\PowerShell\Microsoft.PowerShell_profile.ps1`
- ✓ Perfil VSCode duplicado: `C:\Users\Smurf\OneDrive\Documentos\PowerShell\Microsoft.VSCode_profile.ps1`
- ✓ Backup disponible: `Microsoft.PowerShell_profile.ps1.bak`
- ✓ Función `Kill-StuckTerms` y alias `kst` disponibles
- ✓ Sin comandos destructivos al inicio

---

## 🎯 Próximos Pasos

### Opción A: Usar el perfil inmediatamente

1. Cierra esta terminal
2. Abre una nueva terminal en Cursor
3. El perfil limpio se cargará automáticamente

### Opción B: Recargar Cursor completo

1. Presiona `Ctrl+Shift+P`
2. Escribe: `Developer: Reload Window`
3. Abre una nueva terminal

---

## 🔧 Configuración Manual de Cursor (Si necesitas -NoProfile temporalmente)

### Si el perfil actual impide abrir la terminal:

1. **Editar settings.json de Cursor:**
   - Ubicación: `%APPDATA%\Cursor\User\settings.json`
   - Agregar configuración de emergencia:

```json
{
  "terminal.integrated.enablePersistentSessions": false,
  "terminal.integrated.shellIntegration.enabled": true,
  "terminal.integrated.profiles.windows": {
    "PowerShell 7 (NoProfile)": {
      "path": "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
      "args": ["-NoProfile"]
    }
  },
  "terminal.integrated.defaultProfile.windows": "PowerShell 7 (NoProfile)"
}
```

2. **Recargar Cursor:**
   - `Ctrl+Shift+P` → `Developer: Reload Window`

3. **Abrir terminal y ejecutar script de reparación**

---

## 🚨 Emergencia: Deshabilitar perfiles manualmente

Si PowerShell sigue cayendo al iniciar con perfil:

**Opción 1: Desde CMD**

```cmd
ren "%USERPROFILE%\OneDrive\Documentos\PowerShell\Microsoft.PowerShell_profile.ps1" Microsoft.PowerShell_profile.ps1.disabled
ren "%USERPROFILE%\OneDrive\Documentos\PowerShell\Microsoft.VSCode_profile.ps1" Microsoft.VSCode_profile.ps1.disabled
```

**Opción 2: Desde PowerShell sin perfil**

```powershell
pwsh -NoProfile
Rename-Item "$HOME\OneDrive\Documentos\PowerShell\Microsoft.PowerShell_profile.ps1" "Microsoft.PowerShell_profile.ps1.disabled"
Rename-Item "$HOME\OneDrive\Documentos\PowerShell\Microsoft.VSCode_profile.ps1" "Microsoft.VSCode_profile.ps1.disabled"
```

Luego ejecuta el script de reparación nuevamente.

---

## ✨ Volver al perfil normal en Cursor

Cuando todo funcione correctamente:

1. **Editar `%APPDATA%\Cursor\User\settings.json`:**

```json
{
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "terminal.integrated.profiles.windows": {
    "PowerShell": {
      "path": "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
      "icon": "terminal-powershell"
    }
  }
}
```

2. **Recargar ventana:**
   - `Ctrl+Shift+P` → `Developer: Reload Window`

3. **Verificar funcionamiento:**

```powershell
$PSVersionTable.PSVersion
$Host.Name
kst -DryRun
```

---

## 📋 Comandos Disponibles

| Comando       | Descripción                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------- |
| `kst`         | Mata procesos colgados (ptyhost, powershell, pwsh, node) protegiendo el proceso actual y su padre |
| `kst -DryRun` | Muestra qué procesos se eliminarían SIN ejecutar la acción                                        |
| `. $PROFILE`  | Recarga manualmente el perfil si haces cambios                                                    |

---

## ⚠️ Reglas de Seguridad del Perfil

**El perfil limpio NO ejecuta automáticamente:**

- ❌ `taskkill`
- ❌ `Stop-Process` sin filtros
- ❌ `Exit`

**Solo ejecuta comandos destructivos manualmente:**

- Usa `kst` cuando LO necesites
- Siempre prueba con `kst -DryRun` primero

---

## 🆘 Plan de Emergencia

Si una sesión se rompe nuevamente:

1. Abre **CMD** o **PowerShell sin perfil:**

   ```cmd
   "C:\Program Files\PowerShell\7\pwsh.exe" -NoProfile
   ```

2. **Revisa el perfil:**

   ```powershell
   notepad $PROFILE
   ```

3. **Elimina cualquier comando destructivo**

4. **Recarga el perfil:**

   ```powershell
   . $PROFILE
   ```

5. **Si todo falla, restaura el backup:**
   ```powershell
   Copy-Item "$HOME\OneDrive\Documentos\PowerShell\Microsoft.PowerShell_profile.ps1.bak" "$HOME\OneDrive\Documentos\PowerShell\Microsoft.PowerShell_profile.ps1" -Force
   ```

---

## 📝 Notas Importantes

- ✓ El perfil limpio está en OneDrive (sincronizado)
- ✓ Backup creado antes de cualquier modificación
- ✓ Función `Kill-StuckTerms` protege el proceso actual y su padre
- ✓ Sin persistencia de sesiones en Cursor (evita problemas)
- ✓ Integración de shell habilitada

---

**Fecha de reparación:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**PowerShell versión:** 7.5.3  
**Ubicación del perfil:** `C:\Users\Smurf\OneDrive\Documentos\PowerShell\`
