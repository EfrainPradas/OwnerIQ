#!/bin/bash
# Add OwnerIQ to the active nginx config file

CONFIG_FILE="/etc/nginx/sites-enabled/carreertips-ssl"

# Check if ownerIQ already exists
if grep -q "ownerIQ" "$CONFIG_FILE"; then
    echo "OwnerIQ already exists in config, removing old entries..."
    sudo sed -i '/# OwnerIQ/,/^$/d' "$CONFIG_FILE"
    sudo sed -i '/location.*ownerIQ/,/^    }$/d' "$CONFIG_FILE"
fi

# Create owneriq config block
OWNERIQ_CONFIG='
    # OwnerIQ Frontend
    location /ownerIQ/ {
        alias /var/www/ownerIQ/frontend/;
        index index.html;
        try_files $uri $uri/ /ownerIQ/index.html;
    }

    # OwnerIQ API proxy
    location /ownerIQ-api/ {
        rewrite ^/ownerIQ-api/(.*) /$1 break;
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
'

# Add to config file (insert before the last closing brace)
echo "$OWNERIQ_CONFIG" | sudo tee /tmp/owneriq_block.conf

# Backup
sudo cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"

# Insert before the closing brace of the server block
sudo sed -i '/^}$/i \    # OwnerIQ Frontend\n    location /ownerIQ/ {\n        alias /var/www/ownerIQ/frontend/;\n        index index.html;\n        try_files $uri $uri/ /ownerIQ/index.html;\n    }\n\n    # OwnerIQ API proxy\n    location /ownerIQ-api/ {\n        rewrite ^/ownerIQ-api/(.*) /$1 break;\n        proxy_pass http://localhost:5001;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_cache_bypass $http_upgrade;\n        client_max_body_size 50M;\n    }' "$CONFIG_FILE"

# Test and reload
echo "Testing nginx config..."
sudo nginx -t
if [ $? -eq 0 ]; then
    echo "Config OK, reloading nginx..."
    sudo systemctl reload nginx
    echo "SUCCESS!"
else
    echo "Config error! Restoring backup..."
    sudo cp "${CONFIG_FILE}.backup" "$CONFIG_FILE"
    sudo systemctl reload nginx
fi
