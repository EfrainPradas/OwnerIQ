# Instrucciones para Subir a GitHub

## El problema
GitHub ya no acepta autenticación con password para operaciones git. Necesitas crear un **Personal Access Token (PAT)**.

## Solución: Crear Personal Access Token

### Paso 1: Crear el Token en GitHub

1. Ve a GitHub.com y haz login con:
   - Email: efraijnpradas@gmail.com
   - Password: Pr@d4.2025.**

2. En la esquina superior derecha, haz click en tu foto de perfil → **Settings**

3. En el menú izquierdo, baja hasta el final y haz click en **Developer settings**

4. Click en **Personal access tokens** → **Tokens (classic)**

5. Click en **Generate new token** → **Generate new token (classic)**

6. Configura el token:
   - **Note**: "OwnerIQ Development"
   - **Expiration**: 90 days (o No expiration si prefieres)
   - **Select scopes**: Marca estas opciones:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)

7. Scroll abajo y click en **Generate token**

8. **IMPORTANTE**: Copia el token inmediatamente (empieza con `ghp_...`)
   - Lo necesitarás en el siguiente paso
   - No podrás verlo de nuevo

### Paso 2: Usar el Token para Push

Una vez que tengas el token, ejecuta estos comandos:

```bash
cd /home/efraiprada/projects/OwnerIQ

# Remover el remote actual
git remote remove origin

# Agregar el remote con el token
# Reemplaza YOUR_TOKEN_HERE con el token que copiaste
git remote add origin https://YOUR_TOKEN_HERE@github.com/efraijnpradas/OwnerIQ.git

# Push a GitHub
git push -u origin main
```

### Ejemplo:
Si tu token es `ghp_abc123xyz789`, el comando sería:
```bash
git remote add origin https://ghp_abc123xyz789@github.com/efraijnpradas/OwnerIQ.git
```

## Alternativa: Usar SSH

Si prefieres no usar tokens en la URL, puedes usar SSH:

### 1. Generar SSH key (si no tienes una)
```bash
ssh-keygen -t ed25519 -C "efraijnpradas@gmail.com"
# Presiona Enter para aceptar la ubicación por defecto
# Presiona Enter dos veces para no usar passphrase (o crea una si prefieres)
```

### 2. Copiar la SSH key
```bash
cat ~/.ssh/id_ed25519.pub
# Copia todo el contenido
```

### 3. Agregar la key a GitHub
1. Ve a GitHub → Settings → SSH and GPG keys
2. Click "New SSH key"
3. Title: "OwnerIQ Development WSL"
4. Key: Pega el contenido que copiaste
5. Click "Add SSH key"

### 4. Configurar el remote con SSH
```bash
cd /home/efraiprada/projects/OwnerIQ
git remote remove origin
git remote add origin git@github.com:efraijnpradas/OwnerIQ.git
git push -u origin main
```

---

## Estado Actual

✅ Repositorio inicializado
✅ Todos los archivos agregados (172 archivos, 108,989 líneas)
✅ Commit inicial creado
✅ Branch renombrado a 'main'
❌ Pendiente: Push a GitHub (necesita token o SSH)

## Verificar que todo está listo

```bash
cd /home/efraiprada/projects/OwnerIQ
git status
git log --oneline
git remote -v
```

Deberías ver:
- Status: "Your branch is based on 'origin/main', but the upstream is gone"
- Log: Un commit con mensaje "Initial commit: OwnerIQ Real Estate Portfolio Management Platform"
- Remote: origin apuntando a GitHub (aunque sin token válido aún)

---

## Después del Push Exitoso

Una vez que hagas push, tu código estará en:
https://github.com/efraijnpradas/OwnerIQ

Podrás:
- Ver todo el código online
- Clonar el repo desde cualquier máquina
- Hacer pull/push de cambios
- Usar GitHub como backup

---

**¿Prefieres la opción del Token o SSH?**
- **Token**: Más rápido, pero el token está visible en el remote URL
- **SSH**: Más seguro, pero requiere configurar la key
