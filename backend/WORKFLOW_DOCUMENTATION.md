# 🔄 WORKFLOW COMPLETO: De Onboarding a Propiedades Guardadas

## 📊 Tablas Involucradas

### 1. **`property_onboarding`** - Configuración del Usuario
```sql
Columns:
- user_id (UUID, PRIMARY KEY)
- has_primary_residence (BOOLEAN) ← Indica si quiere registrar vivienda principal
- investment_property_count (INTEGER) ← Cuántas propiedades de inversión tiene
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 2. **`person`** - Datos del Propietario
```sql
Columns:
- person_id (UUID, PRIMARY KEY) ← Mapea a user_id
- legal_type (TEXT, NOT NULL) ← 'individual' o 'entity'
- full_name (TEXT, NOT NULL)
- status (TEXT, NOT NULL) ← 'active'
- notes (JSONB, NOT NULL) ← {}
```

### 3. **`property`** - Propiedades
```sql
Columns:
- property_id (UUID, PRIMARY KEY)
- person_id (UUID, FK → person.person_id, NOT NULL)
- address (TEXT)
- city (TEXT)
- state (TEXT)
- zip_code (TEXT)
- property_type (TEXT)
- is_primary_residence (BOOLEAN) ← ¡NUEVO! Marca si es vivienda principal
- ... (otros campos)
```

### 4. **`import_batches`** - Lotes de Importación
```sql
Columns:
- batch_id (UUID, PRIMARY KEY)
- user_id (UUID)
- status (TEXT)
- created_at (TIMESTAMP)
```

### 5. **`document_uploads`** - Documentos Cargados
```sql
Columns:
- upload_id (UUID, PRIMARY KEY)
- user_id (UUID)
- batch_id (UUID, FK → import_batches.batch_id)
- filename (TEXT)
- upload_status (TEXT) ← 'UPLOADED', 'PROCESSING', 'COMPLETED'
- extracted_data (JSONB)
```

---

## 🔄 Flujo Completo

### **PASO 1: Usuario Completa Onboarding**
```
Frontend → POST /api/onboarding/complete
         → INSERT INTO property_onboarding
            - has_primary_residence = true
            - investment_property_count = 2
```

### **PASO 2: Usuario Sube Documentos**
```
Frontend → POST /api/admin/upload-documents
         → INSERT INTO import_batches (batch_id, user_id)
         → INSERT INTO document_uploads (batch_id, user_id, filename)
```

### **PASO 3: Usuario Hace Click en "⚡ Procesar Todo"**
```
Frontend → POST /api/admin/process-all
         ↓
Backend:
  1. Consulta property_onboarding
     ✓ has_primary_residence = true
     ✓ investment_property_count = 2
  
  2. Itera documentos:
     - Primer documento → is_primary_residence = TRUE  (🏠 Primary)
     - Segundo documento → is_primary_residence = FALSE (💼 Investment)
     - Tercer documento → is_primary_residence = FALSE  (💼 Investment)
  
  3. Para cada documento:
     a. Verifica si existe person con person_id = user_id
     b. Si no existe → CREATE person
     c. INSERT INTO property con is_primary_residence correcto
```

### **PASO 4: Usuario Ve Propiedades**
```
Frontend → GET /api/properties
         → SELECT * FROM property WHERE person_id = user_id
         → Muestra badges:
            - 🏠 Primary (verde)
            - 💼 Investment (naranja)
```

---

## ✅ Estado Esperado Después del Reset

| Tabla | Registros | Detalles |
|-------|-----------|----------|
| `property_onboarding` | 1 | `has_primary_residence=true, investment_property_count=2` |
| `person` | 1 | Creado automáticamente con `person_id = user_id` |
| `property` | 0 | Vacío, listo para procesar documentos |
| `import_batches` | 0 | Vacío, se crea al subir documentos |
| `document_uploads` | 0 | Vacío, se crea al subir documentos |

---

## 🚀 Siguiente Acción

1. **Ejecutar:** `complete-reset.sql` en Supabase SQL Editor
2. **Verificar:** Backend logs muestran: `📋 User has primary residence: true`
3. **Subir documentos** (3 documentos)
4. **Procesar:** Click en "⚡ Procesar Todo Automáticamente"
5. **Resultado Esperado:**
   - Primera propiedad: `is_primary_residence = TRUE` 🏠
   - Segunda propiedad: `is_primary_residence = FALSE` 💼
   - Tercera propiedad: `is_primary_residence = FALSE` 💼
