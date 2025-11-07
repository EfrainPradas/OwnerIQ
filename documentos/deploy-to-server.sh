#!/bin/bash

# Script para desplegar cambios al servidor Debian
# Actualiza el backend sin código de demo y frontend corregido

echo "🚀 Iniciando despliegue al servidor Debian..."

# Configuración del servidor
SERVER_IP="3.145.4.238"
SERVER_USER="root"
LOCAL_BACKEND="./backend"
LOCAL_FRONTEND="./frontend"
REMOTE_PATH="/root/owneriq"

echo "📦 Copiando archivos al servidor..."

# Crear directorio remoto si no existe
ssh $SERVER_USER@$SERVER_IP "mkdir -p $REMOTE_PATH"

# Copiar backend actualizado
echo "📁 Copiando backend..."
scp -r $LOCAL_BACKEND/* $SERVER_USER@$SERVER_IP:$REMOTE_PATH/backend/

# Copiar frontend actualizado
echo "📁 Copiando frontend..."
scp -r $LOCAL_FRONTEND/* $SERVER_USER@$SERVER_IP:$REMOTE_PATH/frontend/

echo "🔄 Reiniciando servicios en el servidor..."

# Reiniciar PM2 (si está corriendo)
ssh $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH/backend && pm2 restart owneriq-backend 2>/dev/null || echo 'PM2 no está corriendo, iniciando manualmente...'"

# O iniciar manualmente si no hay PM2
ssh $SERVER_USER@$SERVER_IP "cd $REMOTE_PATH/backend && node server.js > server.log 2>&1 & echo \$! > server.pid"

# Corregir propiedad demo (esperar a que el backend esté listo)
echo "🔧 Corrigiendo propiedad demo..."
sleep 3
ssh $SERVER_USER@$SERVER_IP "curl -X POST http://localhost:5000/api/fix-demo-property -s || echo 'No se pudo corregir propiedad demo'"

# Reiniciar nginx
ssh $SERVER_USER@$SERVER_IP "sudo systemctl reload nginx"

echo "✅ Despliegue completado!"
echo ""
echo "🔍 Verificación:"
echo "- Backend: http://$SERVER_IP:5000/api/properties"
echo "- Frontend: http://$SERVER_IP/"
echo ""
echo "📋 Para verificar logs del backend:"
echo "ssh $SERVER_USER@$SERVER_IP 'tail -f $REMOTE_PATH/backend/server.log'"