#!/bin/bash
# Clean fix for OwnerIQ nginx config

# First, check if backup exists
if [ ! -f /etc/nginx/sites-available/default.backup ]; then
    echo "No backup found, creating one..."
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
fi

# Create clean config for OwnerIQ
sudo bash -c 'cat > /etc/nginx/sites-available/owneriq << ENDCONFIG
# OwnerIQ location block
location /ownerIQ/ {
    alias /var/www/ownerIQ/frontend/;
    index index.html;
    try_files \$uri \$uri/ @owneriq_fallback;
}

location @owneriq_fallback {
    root /var/www/ownerIQ/frontend;
    rewrite ^ /index.html break;
}

# OwnerIQ API proxy
location /ownerIQ-api/ {
    rewrite ^/ownerIQ-api/(.*) /\$1 break;
    proxy_pass http://localhost:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    client_max_body_size 50M;
}
ENDCONFIG'

# Restore the original backup without ownerIQ
sudo cp /etc/nginx/sites-available/default.backup /etc/nginx/sites-available/default

# Remove any existing owneriq blocks and add clean one
sudo sed -i '/# OwnerIQ/,/client_max_body_size 50M;$/d' /etc/nginx/sites-available/default
sudo sed -i '/location \/ownerIQ/,/^    }$/d' /etc/nginx/sites-available/default
sudo sed -i '/location @owneriq_fallback/,/^    }$/d' /etc/nginx/sites-available/default

# Insert the owneriq config after the first separator line
sudo sed -i '/^    # ============================================================================$/r /etc/nginx/sites-available/owneriq' /etc/nginx/sites-available/default

# Test and reload
echo "Testing nginx config..."
sudo nginx -t
if [ $? -eq 0 ]; then
    echo "Config OK, reloading nginx..."
    sudo systemctl reload nginx
    echo "SUCCESS! OwnerIQ should be available at /ownerIQ/"
else
    echo "Config error! Restoring backup..."
    sudo cp /etc/nginx/sites-available/default.backup /etc/nginx/sites-available/default
    sudo systemctl reload nginx
fi
