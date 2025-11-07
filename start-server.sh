#!/bin/bash

# Script de inicio rápido para el servidor OwnerIQ
# Este script inicia el servidor backend de forma simple

echo "Iniciando servidor OwnerIQ..."

# Navegar al directorio backend
cd backend

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias..."
    npm install
fi

# Verificar si PM2 está instalado
if command -v pm2 &> /dev/null; then
    echo "Usando PM2..."
    pm2 stop owneriq-backend 2>/dev/null
    pm2 delete owneriq-backend 2>/dev/null
    pm2 start server.js --name owneriq-backend
    pm2 save
    echo "✓ Servidor iniciado con PM2"
    echo "Usa 'pm2 logs owneriq-backend' para ver los logs"
else
    echo "PM2 no está instalado. Iniciando con node..."
    nohup node server.js > server.log 2>&1 &
    echo "✓ Servidor iniciado en segundo plano"
    echo "Revisa server.log para ver los logs"
fi

echo ""
echo "Servidor corriendo en http://localhost:5000"
echo "API disponible en http://localhost:5000/api"