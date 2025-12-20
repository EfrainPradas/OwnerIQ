const fs = require('fs');
const path = require('path');

// Directorio a escanear
const srcDir = path.join(__dirname, 'frontend/src');

// Función para corregir errores de sintaxis
function fixSyntaxErrors(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Corregir: const (session) -> const session
  let newContent = content.replace(/const\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/g, 'const $1');

  // Guardar cambios si se modificó
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Fixed syntax: ${filePath}`);
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
      if (fixSyntaxErrors(filePath)) {
        fixedCount++;
      }
    }
  }

  return fixedCount;
}

// Ejecutar el script
console.log('🔧 Fixing syntax errors...');
const totalFixed = scanDirectory(srcDir);
console.log(`\n✅ Fixed ${totalFixed} files`);