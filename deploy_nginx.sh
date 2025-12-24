#!/bin/bash
# Backup original file
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Insert OwnerIQ config after the second occurrence of the separator line
sudo awk '/# ============================================================================/ && ++count == 2 {print; system("cat /tmp/owneriq_nginx.conf"); next} 1' \
  /etc/nginx/sites-available/default.backup > /tmp/nginx_new_config

# Move new config to nginx
sudo mv /tmp/nginx_new_config /etc/nginx/sites-available/default

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
if [ $? -eq 0 ]; then
  echo "Nginx config test passed! Reloading..."
  sudo systemctl reload nginx
  echo "OwnerIQ deployed successfully!"
else
  echo "Nginx config test failed! Restoring backup..."
  sudo mv /etc/nginx/sites-available/default.backup /etc/nginx/sites-available/default
fi
