#!/bin/bash
# Fix nginx config for OwnerIQ

# Create the correct location block
sudo bash -c 'cat > /tmp/owneriq_fixed.conf << ENDCONFIG
    # OwnerIQ Frontend
    location /ownerIQ {
        alias /var/www/ownerIQ/frontend;
        index index.html;
        
        location ~ ^/ownerIQ(.*) {
            alias /var/www/ownerIQ/frontend\$1;
            try_files \$uri \$uri/ /var/www/ownerIQ/frontend/index.html;
        }
    }

    # OwnerIQ API proxy
    location ^~ /ownerIQ-api/ {
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

# Restore backup and create new config
sudo cp /etc/nginx/sites-available/default.backup /etc/nginx/sites-available/default

# Add ownerIQ config after the first separator (before carreertips)
sudo sed -i '/^    # ============================================================================$/r /tmp/owneriq_fixed.conf' /etc/nginx/sites-available/default

# Test and reload
sudo nginx -t && sudo systemctl reload nginx && echo "SUCCESS!"
