# Pasos Rápidos para Solucionar el Servidor Debian

## El Problema
El servidor backend de Node.js NO está corriendo en el servidor Debian.

## Solución Rápida

### OPCIÓN 1: Usar Script Automático (MÁS FÁCIL)

Desde tu máquina Windows, abre Git Bash o PowerShell y ejecuta:

```bash
# Hacer ejecutable el script
chmod +x deploy-to-server.sh

# Ejecutar (esto copiará todo y ejecutará el diagnóstico)
./deploy-to-server.sh
```

**NOTA**: Necesitas ajustar la ruta remota en el script si tu proyecto no está en `/home/admin/OwnerIQ`

---

### OPCIÓN 2: Pasos Manuales

#### 1. Conectarse al Servidor
```bash
ssh -i connection/OwnerIQ.pem admin@3.145.4.238
```

#### 2. Verificar Ubicación del Proyecto
```bash
# Buscar dónde está el proyecto
find /home -name "OwnerIQ" 2>/dev/null
# O
find /var/www -name "OwnerIQ" 2>/dev/null
```

#### 3. Ir al Directorio del Proyecto
```bash
cd /ruta/encontrada/OwnerIQ
```

#### 4. Copiar los Scripts (desde tu máquina local)
Abre otra terminal en tu máquina Windows y ejecuta:

```bash
# Copiar scripts (ajusta la ruta remota según donde esté tu proyecto)
scp -i connection/OwnerIQ.pem server-diagnostics.sh admin@3.145.4.238:/home/admin/OwnerIQ/
scp -i connection/OwnerIQ.pem start-server.sh admin@3.145.4.238:/home/admin/OwnerIQ/

# Copiar frontend actualizado (sin datos demo)
scp -i connection/OwnerIQ.pem frontend/src/App.js admin@3.145.4.238:/home/admin/OwnerIQ/frontend/src/
```

#### 5. Volver al Servidor y Ejecutar
En la terminal del servidor:

```bash
# Hacer ejecutables
chmod +x server-diagnostics.sh
chmod +x start-server.sh

# Ejecutar diagnóstico
./server-diagnostics.sh
```

---

### OPCIÓN 3: Solo Iniciar el Servidor (Si ya está todo configurado)

```bash
# Conectarse
ssh -i connection/OwnerIQ.pem admin@3.145.4.238

# Ir al backend
cd /ruta/al/proyecto/OwnerIQ/backend

# Iniciar con PM2
pm2 start server.js --name owneriq-backend
pm2 save

# Verificar
pm2 status
pm2 logs owneriq-backend
```

---

## Verificación

Después de ejecutar cualquiera de las opciones:

1. **Verificar PM2**:
   ```bash
   pm2 status
   ```
   Debería mostrar "owneriq-backend" en estado "online"

2. **Probar API**:
   ```bash
   curl http://localhost:5000/
   ```
   Debería responder: "OwnerIQ API"

3. **Abrir en navegador**:
   http://3.145.4.238/
   
   - Si ves alertas de error → El backend NO está corriendo
   - Si ves datos o "No properties found" → El backend SÍ está corriendo

---

## Comandos Útiles

```bash
# Ver logs en tiempo real
pm2 logs owneriq-backend

# Reiniciar servidor
pm2 restart owneriq-backend

# Detener servidor
pm2 stop owneriq-backend

# Ver estado de nginx
sudo systemctl status nginx
```

---

## Notas Importantes

1. **Ya NO hay datos demo** - El frontend ahora solo muestra datos reales
2. **Rutas importantes**:
   - Backend: `/ruta/al/proyecto/OwnerIQ/backend`
   - Frontend: `/var/www/html` (servido por nginx)
3. **Puerto del backend**: 5000
4. **Nginx hace proxy**: `/api` → `http://localhost:5000`

---

## Si Necesitas Ayuda

Revisa los logs:
```bash
# Logs del backend
pm2 logs owneriq-backend --lines 50

# Logs de nginx
sudo tail -50 /var/log/nginx/error.log