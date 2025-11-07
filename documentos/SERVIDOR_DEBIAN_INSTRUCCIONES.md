# Instrucciones para Solucionar el Problema del Servidor Debian

## Problema Identificado
El servidor en http://3.145.4.238/ no está cargando los datos de la base de datos porque el servidor Node.js backend no está corriendo.

## Solución Paso a Paso

### 1. Conectarse al Servidor Debian
```bash
ssh -i connection/OwnerIQ.pem admin@3.145.4.238
```

### 2. Navegar al Directorio del Proyecto
```bash
cd /ruta/al/proyecto/OwnerIQ
```

### 3. Ejecutar el Script de Diagnóstico
He creado un script que automáticamente:
- Verifica la instalación de Node.js y npm
- Instala las dependencias si es necesario
- Verifica la configuración del .env
- Verifica que el puerto 5000 esté disponible
- Inicia el servidor con PM2 (gestor de procesos)
- Prueba la conexión a Supabase
- Verifica que la API esté respondiendo

```bash
# Hacer el script ejecutable
chmod +x server-diagnostics.sh

# Ejecutar el script
./server-diagnostics.sh
```

### 4. Verificación Manual (si es necesario)

#### Verificar si el servidor está corriendo:
```bash
pm2 status
```

#### Ver los logs del servidor:
```bash
pm2 logs owneriq-backend
```

#### Reiniciar el servidor:
```bash
pm2 restart owneriq-backend
```

#### Detener el servidor:
```bash
pm2 stop owneriq-backend
```

### 5. Verificar Nginx

#### Verificar estado de nginx:
```bash
sudo systemctl status nginx
```

#### Reiniciar nginx si es necesario:
```bash
sudo systemctl restart nginx
```

#### Verificar configuración de nginx:
```bash
sudo nginx -t
```

### 6. Probar la API

#### Desde el servidor:
```bash
curl http://localhost:5000/
# Debería responder: "OwnerIQ API"

curl http://localhost:5000/api/properties
# Debería responder con datos JSON
```

#### Desde tu navegador:
```
http://3.145.4.238/api/properties
```

## Configuración Actual

### Backend (server.js)
- Puerto: 5000
- Base de datos: Supabase
- URL: https://zapanqzqloibnbsvkbob.supabase.co

### Nginx
- Escucha en puerto 80
- Proxy de `/api` a `http://localhost:5000`
- Sirve archivos estáticos desde `/var/www/html`

### Frontend
- Hace llamadas a `/api/*` (rutas relativas)
- Se conecta directamente a Supabase para autenticación

## Comandos Útiles

### PM2 (Gestor de Procesos)
```bash
pm2 list                    # Listar todos los procesos
pm2 logs owneriq-backend    # Ver logs en tiempo real
pm2 restart owneriq-backend # Reiniciar el servidor
pm2 stop owneriq-backend    # Detener el servidor
pm2 start owneriq-backend   # Iniciar el servidor
pm2 delete owneriq-backend  # Eliminar el proceso
pm2 save                    # Guardar la lista de procesos
pm2 startup                 # Configurar PM2 para iniciar al arranque
```

### Verificar Puertos
```bash
# Ver qué está usando el puerto 5000
sudo lsof -i :5000

# Ver qué está usando el puerto 80
sudo lsof -i :80

# Ver todos los puertos en uso
sudo netstat -tulpn
```

### Logs del Sistema
```bash
# Logs de nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Logs del servidor Node.js (si no usas PM2)
tail -f backend/server.log
```

## Solución de Problemas Comunes

### 1. Puerto 5000 ya está en uso
```bash
# Encontrar el proceso
sudo lsof -i :5000

# Matar el proceso (reemplaza PID con el número del proceso)
sudo kill -9 PID
```

### 2. Dependencias no instaladas
```bash
cd backend
npm install
```

### 3. Variables de entorno no configuradas
Verificar que el archivo `backend/.env` contenga:
```
SUPABASE_URL=https://zapanqzqloibnbsvkbob.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcGFucXpxbG9pYm5ic3ZrYm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTgzNTIsImV4cCI6MjA3NDU3NDM1Mn0.mwspXsW5xDu9CmWruosq3d0w_mPX5g-zGhZkFgCxHqM
JWT_SECRET=your_secret_key_here
PORT=5000
```

### 4. Nginx no está redirigiendo correctamente
Verificar que `/etc/nginx/sites-available/default` contenga:
```nginx
location /api {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

### 5. Firewall bloqueando conexiones
```bash
# Verificar firewall
sudo ufw status

# Permitir puerto 80 (HTTP)
sudo ufw allow 80/tcp

# Permitir puerto 443 (HTTPS)
sudo ufw allow 443/tcp
```

## Inicio Automático al Arranque

Para que el servidor se inicie automáticamente cuando el servidor Debian se reinicie:

```bash
# Configurar PM2 para iniciar al arranque
pm2 startup

# Guardar la configuración actual
pm2 save
```

## Verificación Final

Después de ejecutar el script, verifica que todo funcione:

1. ✅ El servidor Node.js está corriendo: `pm2 status`
2. ✅ La API responde: `curl http://localhost:5000/`
3. ✅ Nginx está corriendo: `sudo systemctl status nginx`
4. ✅ El sitio web carga: http://3.145.4.238/
5. ✅ Los datos se cargan: http://3.145.4.238/ (debería mostrar propiedades)

## Contacto y Soporte

Si después de seguir estos pasos el problema persiste, revisa:
- Los logs de PM2: `pm2 logs owneriq-backend`
- Los logs de nginx: `sudo tail -f /var/log/nginx/error.log`
- La conectividad a Supabase: `curl https://zapanqzqloibnbsvkbob.supabase.co`