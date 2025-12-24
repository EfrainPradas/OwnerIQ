#!/bin/bash
cd /home/efraiprada/projects/OwnerIQ/frontend/src

# Replace all hardcoded localhost URLs with API_BASE_URL
find . -name "*.js" -exec sed -i "s/http:\/\/localhost:5001/\${API_BASE_URL}/g" {} \;

echo "Done! Checking replacements..."
grep -r "API_BASE_URL" --include="*.js" . | wc -l
