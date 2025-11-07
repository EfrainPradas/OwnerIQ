from pathlib import Path

app_path = Path('frontend/src/App.js')
text = app_path.read_text(encoding='utf-8')
marker = 'function PropertiesView('
start = text.index(marker)
rest = text[start:]
try:
    end_offset = rest.index('\nfunction ', 1)
except ValueError:
    raise SystemExit('Unable to locate the end of PropertiesView component')
block = rest[:end_offset].rstrip() + '\n'
updated_text = text[:start] + rest[end_offset:]

views_dir = Path('frontend/src/views')
views_dir.mkdir(parents=True, exist_ok=True)
new_file = views_dir / 'PropertiesView.js'
header = "import React, { useState, useEffect } from 'react';\nimport { supabase } from '../supabaseClient';\nimport { API_BASE_URL, ENABLE_DEMO_MODE } from '../config';\nimport PropertyDocuments from '../components/PropertyDocuments';\nimport PropertyScorecard from '../components/PropertyScorecard';\n\n"
content = header + block + "\nexport default PropertiesView;\n"
new_file.write_text(content, encoding='utf-8')

# Update App.js imports to use new component
import_line = "import PropertyDocuments from './components/PropertyDocuments';\n"
replacement_import_line = "import PropertyDocuments from './components/PropertyDocuments';\nimport PropertiesView from './views/PropertiesView';\n"
if replacement_import_line not in updated_text:
    updated_text = updated_text.replace(import_line, replacement_import_line, 1)

app_path.write_text(updated_text, encoding='utf-8')
