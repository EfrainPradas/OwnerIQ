# 🚀 Despliegue Simple de OwnerIQ

Método rápido y directo similar a tu proceso anterior.

## Uso

```bash
./deploy-simple.sh
```

## Lo que hace

1. Compila el frontend (`npm run build`)
2. Sube frontend a `/var/www/ownerIQ-frontend/`
3. Sube backend a `/var/www/ownerIQ-backend/`
4. Reinicia el backend con PM2

## Pre-requisitos en el Servidor

El servidor debe tener configurado:

- Directorios: `/var/www/ownerIQ-frontend/` y `/var/www/ownerIQ-backend/`
- Node.js y npm instalados
- PM2 instalado globalmente
- Nginx configurado (ver abajo)

## Configuración Manual del Servidor (Primera Vez)

### 1. Conectarse al servidor

```bash
ssh -i connection/OwnerIQ.pem admin@3.145.4.238
```

### 2. Instalar dependencias

```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx
sudo apt-get install -y nginx
```

### 3. Crear directorios

```bash
sudo mkdir -p /var/www/ownerIQ-frontend
sudo mkdir -p /var/www/ownerIQ-backend
sudo chown -R admin:admin /var/www/ownerIQ-frontend
sudo chown -R admin:admin /var/www/ownerIQ-backend
```

### 4. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/owneriq
```

Pegar esta configuración:

```nginx
server {
    listen 80;
    server_name 3.145.4.238;

    # Frontend
    location / {
        root /var/www/ownerIQ-frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    client_max_body_size 50M;
}
```

Activar el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/owneriq /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 5. Configurar variables de entorno

```bash
cd /var/www/ownerIQ-backend
nano .env
```

Pegar:

```env
SUPABASE_URL=https://zapanqzqloibnbsvkbob.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcGFucXpxbG9pYm5ic3ZrYm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTgzNTIsImV4cCI6MjA3NDU3NDM1Mn0.mwspXsW5xDu9CmWruosq3d0w_mPX5g-zGhZkFgCxHqM
JWT_SECRET=your_production_secret_key
PORT=5000
RAPIDAPI_KEY=1f89628a9fmsh337ca7272df9f7ep12ae6ejsnb0b3992c7f1a
OPENAI_API_KEY=your_openai_api_key_here
AI_PROVIDER=openai
AI_CLASSIFIER_MODEL=gpt-4o-mini
AI_EXTRACTOR_MODEL=gpt-4o
NODE_ENV=production
```

### 6. Primera ejecución

```bash
cd /var/www/ownerIQ-backend
npm install
pm2 start server.js --name owneriq-backend
pm2 save
pm2 startup
```

## Después de la Configuración Inicial

Solo ejecuta el script de despliegue:

```bash
./deploy-simple.sh
```

## Comandos Útiles

Ver logs:
```bash
ssh -i connection/OwnerIQ.pem admin@3.145.4.238 'pm2 logs owneriq-backend'
```

Ver estado:
```bash
ssh -i connection/OwnerIQ.pem admin@3.145.4.238 'pm2 status'
```

Reiniciar:
```bash
ssh -i connection/OwnerIQ.pem admin@3.145.4.238 'pm2 restart owneriq-backend'
```

## URL de la Aplicación

http://3.145.4.238

---

**Nota**: Este script asume que el servidor ya está configurado. Para configuración inicial completa y automática, usa `./deploy.sh` en su lugar.
