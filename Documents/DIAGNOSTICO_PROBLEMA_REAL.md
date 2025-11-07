# Diagnóstico del Problema Real - Servidor Debian

## Problema
El sitio http://3.145.4.238/ NO está cargando datos de la base de datos.

## Causa Raíz Identificada
El servidor backend de Node.js **NO está corriendo** en el servidor Debian.

## Evidencia
1. El frontend hace llamadas a `/api/properties` (ruta relativa)
2. Nginx está configurado para hacer proxy de `/api/*` a `http://localhost:5000`
3. Si el servidor Node.js no está corriendo en el puerto 5000, las llamadas fallan
4. El frontend ahora mostrará errores claros en lugar de datos demo

## Cambios Realizados

### 1. Eliminados TODOS los datos demo del frontend
- ✅ Eliminados datos demo de propiedades
- ✅ Eliminados datos demo de clientes (borrowers/lenders/tenants)
- ✅ Eliminados datos demo de perfil y direcciones
- ✅ Ahora muestra alertas claras cuando la API no responde

### 2. Archivos de Solución Creados
- `server-diagnostics.sh` - Script completo de diagnóstico y reparación
- `start-server.sh` - Script simple para iniciar el servidor
- `SERVIDOR_DEBIAN_INSTRUCCIONES.md` - Documentación completa

## Pasos para Solucionar (EJECUTAR EN EL SERVIDOR DEBIAN)

### Opción 1: Script Automático (RECOMENDADO)
```bash
# Conectarse al servidor
ssh -i connection/OwnerIQ.pem admin@3.145.4.238

# Navegar al directorio del proyecto
cd /ruta/al/proyecto/OwnerIQ

# Ejecutar script de diagnóstico
chmod +x server-diagnostics.sh
./server-diagnostics.sh
```

### Opción 2: Pasos Manuales
```bash
# 1. Conectarse al servidor
ssh -i connection/OwnerIQ.pem admin@3.145.4.238

# 2. Navegar al backend
cd /ruta/al/proyecto/OwnerIQ/backend

# 3. Instalar dependencias (si es necesario)
npm install

# 4. Verificar archivo .env existe
cat .env

# 5. Instalar PM2 (gestor de procesos)
sudo npm install -g pm2

# 6. Iniciar el servidor
pm2 start server.js --name owneriq-backend

# 7. Guardar configuración
pm2 save

# 8. Configurar inicio automático
pm2 startup

# 9. Verificar que está corriendo
pm2 status
pm2 logs owneriq-backend
```

## Verificación

### 1. Verificar que el servidor Node.js está corriendo
```bash
pm2 status
# Debería mostrar "owneriq-backend" con estado "online"
```

### 2. Probar la API directamente
```bash
curl http://localhost:5000/
# Debería responder: "OwnerIQ API"

curl http://localhost:5000/api/properties
# Debería responder con JSON (puede estar vacío si no hay datos)
```

### 3. Verificar nginx
```bash
sudo systemctl status nginx
# Debería estar "active (running)"
```

### 4. Probar desde el navegador
- Abrir: http://3.145.4.238/
- Si el backend NO está corriendo, verás alertas claras
- Si el backend SÍ está corriendo, verás los datos reales de la BD

## Comandos Útiles

### PM2
```bash
pm2 list                    # Ver todos los procesos
pm2 logs owneriq-backend    # Ver logs en tiempo real
pm2 restart owneriq-backend # Reiniciar
pm2 stop owneriq-backend    # Detener
pm2 delete owneriq-backend  # Eliminar proceso
```

### Verificar Puertos
```bash
# Ver qué está usando el puerto 5000
sudo lsof -i :5000

# Ver qué está usando el puerto 80
sudo lsof -i :80
```

### Logs
```bash
# Logs de nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Logs de PM2
pm2 logs owneriq-backend --lines 100
```

## Configuración Actual

### Backend
- **Puerto**: 5000
- **Base de datos**: Supabase (https://zapanqzqloibnbsvkbob.supabase.co)
- **Archivo**: backend/server.js
- **Variables de entorno**: backend/.env

### Nginx
- **Puerto**: 80
- **Proxy**: `/api` → `http://localhost:5000`
- **Archivos estáticos**: `/var/www/html`

### Frontend
- **Ubicación**: `/var/www/html` (servido por nginx)
- **API calls**: Rutas relativas `/api/*`
- **Autenticación**: Supabase directamente

## Problema Más Común

**El servidor Node.js NO está corriendo**

Síntomas:
- El sitio carga pero no muestra datos
- Aparecen alertas de "Cannot connect to backend server"
- La consola del navegador muestra errores de red

Solución:
```bash
cd /ruta/al/proyecto/OwnerIQ/backend
pm2 start server.js --name owneriq-backend
pm2 save
```

## Verificación Final

Después de iniciar el servidor, verifica:

1. ✅ PM2 muestra el proceso corriendo: `pm2 status`
2. ✅ La API responde: `curl http://localhost:5000/`
3. ✅ Nginx está corriendo: `sudo systemctl status nginx`
4. ✅ El sitio carga: http://3.145.4.238/
5. ✅ Los datos se cargan (o muestra mensaje claro si no hay datos)

## Notas Importantes

- **NO hay más datos demo**: El frontend ahora solo muestra datos reales de la API
- **Errores claros**: Si la API falla, verás alertas específicas
- **Logs detallados**: Revisa `pm2 logs owneriq-backend` para ver qué está pasando
- **Conexión a Supabase**: El backend se conecta directamente a Supabase, no necesita configuración adicional

## Próximos Pasos

Una vez que el servidor esté corriendo:
1. Verifica que puedes hacer login
2. Intenta agregar una propiedad
3. Verifica que los datos se guardan en Supabase
4. Revisa los logs si hay algún error