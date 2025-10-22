# Commit Signing

## Configuración de Firma de Commits

### GPG (Recomendado)

1. **Generar clave GPG:**
   ```bash
   gpg --full-generate-key
   ```

2. **Configurar Git:**
   ```bash
   git config --global user.signingkey YOUR_GPG_KEY_ID
   git config --global commit.gpgsign true
   ```

3. **Añadir clave a GitHub:**
   - Exportar clave: `gpg --armor --export YOUR_GPG_KEY_ID`
   - Añadir en GitHub Settings > SSH and GPG keys

### SSH (Alternativo)

1. **Generar clave SSH:**
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   ```

2. **Configurar Git:**
   ```bash
   git config --global gpg.format ssh
   git config --global user.signingkey ~/.ssh/id_ed25519.pub
   git config --global commit.gpgsign true
   ```

3. **Añadir clave a GitHub:**
   - Añadir en GitHub Settings > SSH and GPG keys

## Verificación

- Los commits firmados aparecerán con badge "Verified" en GitHub
- Comando para verificar: `git log --show-signature`

## Notas

- La firma es opcional pero recomendada para repositorios críticos
- GitHub verifica automáticamente las firmas
- Los commits no firmados seguirán funcionando normalmente
