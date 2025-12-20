const fs = require('fs');
const path = require('path');

// Directorio a escanear
const srcDir = path.join(__dirname, 'frontend/src');

// Función para reemplazar en un archivo
function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Reemplazar getSession() con session()
  let newContent = content.replace(/supabase\.auth\.getSession\(\)/g, 'supabase.auth.session()');

  // Reemplazar el manejo del resultado
  newContent = newContent.replace(
    /\{ data: \{ session \} \}/g,
    '(session)'
  );

  // Reemplazar setUser(session?.user || null) con setUser(session?.user ?? null)
  newContent = newContent.replace(
    /setUser\(session\?\..*\?\s*\|\|.*\)/g,
    'setUser(session?.user ?? null)'
  );

  // Guardar cambios si se modificó
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    modified = true;
  }

  return modified;
}

// Función para escanear recursivamente
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      fixedCount += scanDirectory(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      if (replaceInFile(filePath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

// Ejecutar el script
console.log('🔧 Fixing Supabase API calls for v1.x compatibility...');
const totalFixed = scanDirectory(srcDir);
console.log(`\n✅ Fixed ${totalFixed} files`);