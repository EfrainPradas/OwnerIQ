# Bulk Document Upload & AI Processing

Esta funcionalidad permite subir carpetas completas de documentos PDF y procesarlos automáticamente con AI para clasificarlos y extraer información estructurada.

## 🎯 Características

- ✅ **Carga de Carpeta Completa**: Selecciona una carpeta entera y sube todos los PDFs de una vez
- ✅ **Carga de Archivos Múltiples**: O selecciona archivos individuales manualmente
- ✅ **Clasificación Automática con IA**: Cada documento es clasificado automáticamente en uno de los siguientes tipos:
  - Closing/ALTA Statement
  - Home Owner Insurance
  - Tax Bill
  - Lease Agreement
  - Mortgage Statement
  - First Payment Letter
  - Initial Escrow Disclosure
  - Exhibit A
  - Otros tipos soportados
- ✅ **Extracción de Datos**: La IA extrae campos estructurados de cada documento
- ✅ **Validación Automática**: Verifica la calidad y confianza de los datos extraídos
- ✅ **Almacenamiento en Supabase**: Los documentos se guardan en Supabase Storage y los metadatos en la base de datos
- ✅ **Progreso en Tiempo Real**: Muestra el progreso de carga y procesamiento
- ✅ **Resultados Detallados**: Resume los documentos procesados por tipo y muestra estadísticas

## 📁 Estructura del Sistema

### Backend

#### Nuevo Endpoint

**POST `/api/ai-pipeline/process-batch`**

Procesa múltiples documentos en un solo request.

**Request:**
- `files`: Array de archivos PDF (hasta 50 archivos, máx 10MB cada uno)
- `property_id`: ID de la propiedad (opcional)

**Response:**
```json
{
  "success": true,
  "batch_id": "batch_1761187880080_abc123",
  "summary": {
    "total_files": 6,
    "successful": 5,
    "failed": 1,
    "duration_ms": 45000,
    "total_tokens_used": 50000
  },
  "results": [
    {
      "document_id": "doc_...",
      "filename": "closing-statement.pdf",
      "document_type": "closing_alta",
      "classification_confidence": 0.95,
      "extracted_data": { /* campos extraídos */ },
      "validation": { /* resultados de validación */ }
    }
    // ... más documentos
  ],
  "by_document_type": {
    "closing_alta": 2,
    "home_owner_insurance": 1,
    "tax_bill": 1,
    "unknown": 1
  },
  "errors": [
    {
      "filename": "corrupted.pdf",
      "error": "Unable to extract text from PDF",
      "document_id": "doc_..."
    }
  ]
}
```

#### Configuración Multer

```javascript
const uploadMultiple = multer({
  dest: config.UPLOAD_DIR,
  limits: {
    fileSize: config.MAX_FILE_SIZE, // 10MB
    files: 50  // Máximo 50 archivos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});
```

### Frontend

#### Componente Principal

**`BulkDocumentUploader.js`**

```jsx
<BulkDocumentUploader
  propertyId={propertyId}
  userId={userId}
  onComplete={(results) => {
    console.log('Processed:', results);
    // Actualizar lista de documentos
  }}
/>
```

**Props:**
- `propertyId`: UUID de la propiedad
- `userId`: UUID del usuario que sube los documentos
- `onComplete`: Callback que se ejecuta cuando el procesamiento termina

**Estados del Componente:**
1. **Selección**: Usuario selecciona carpeta o archivos
2. **Subiendo**: Archivos se suben a Supabase Storage
3. **Procesando**: AI clasifica y extrae datos
4. **Guardando**: Metadatos se guardan en la base de datos
5. **Completado**: Muestra resultados y estadísticas

### Base de Datos

#### Tabla `property_document`

```sql
CREATE TABLE property_document (
  document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES property(property_id),

  -- Información del archivo
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  description TEXT,

  -- Metadatos de AI
  metadata JSONB,

  -- Auditoría
  uploaded_by UUID,
  upload_date TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Metadata JSONB:**
```json
{
  "ai_document_id": "doc_1761187880080_abc123",
  "classification_confidence": 0.95,
  "extracted_fields_count": 42,
  "validation_status": "valid",
  "validation_errors": 0,
  "validation_warnings": 3
}
```

## 🚀 Uso

### 1. Preparar Documentos

Organiza los PDFs de la propiedad en una carpeta. Por ejemplo:

```
11127-Kimberly-Ave/
├── 03.31.25 Signed ALTA - 11127 Kimberly Ave.pdf
├── 03.25.25 HOI Quote 11127 Kimberly-Florida Peninsula.pdf
├── 12.05.24 Tax Payment - 11127 Kimberly.pdf
├── 07.23.25 Certificate of Occupancy.pdf
├── Closing Docs - 11127 Kimberly.pdf
└── Survey.pdf
```

### 2. En la Aplicación

1. Ve a la vista de una propiedad
2. Haz clic en la pestaña "Documents"
3. En la sección "Bulk Document Upload & AI Processing":
   - Haz clic en "📂 Select Folder" para seleccionar una carpeta completa
   - O "📄 Select Files" para seleccionar archivos individuales
4. Revisa la lista de archivos seleccionados
5. Haz clic en "🚀 Upload & Process with AI"
6. Espera mientras se procesan (30-60 segundos por documento)
7. Revisa los resultados:
   - Documentos exitosos organizados por tipo
   - Confianza de clasificación
   - Campos extraídos
   - Errores (si los hay)

### 3. Script de Línea de Comando

También puedes procesar documentos directamente desde la terminal:

```bash
# Procesar carpeta completa
node process-kimberly-docs.js

# Consolidar información extraída
node consolidate-property-info.js
```

## 📊 Tipos de Documentos Soportados

El sistema puede clasificar automáticamente:

| Tipo de Documento | Código | Campos Extraídos (ejemplos) |
|-------------------|--------|----------------------------|
| Closing/ALTA Statement | `closing_alta` | Precio de compra, fecha de cierre, préstamo, información del prestamista |
| Home Owner Insurance | `home_owner_insurance` | Número de póliza, prima anual, cobertura, deducible, vigencia |
| Tax Bill | `tax_bill` | Número de parcela, dirección, valor avaluado, impuesto anual |
| Lease Agreement | `lease_agreement` | Inquilino, renta mensual, fecha inicio/fin, depósito |
| Mortgage Statement | `mortgage_statement` | Número de préstamo, balance, pago mensual, tasa de interés |
| First Payment Letter | `first_payment_letter` | Primera fecha de pago, detalles de escrow |
| Initial Escrow | `initial_escrow` | Depósitos de escrow, impuestos, seguro |
| Exhibit A | `exhibit_a` | Descripción legal de la propiedad |
| Otros | `unknown` | Extracción genérica de campos relevantes |

## ⚙️ Configuración

### Variables de Entorno (Backend)

```bash
# .env en /backend
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai
AI_CLASSIFIER_MODEL=gpt-4o-mini
AI_EXTRACTOR_MODEL=gpt-4o
ENABLE_AI_CACHE=true
LOG_LEVEL=info
LOG_AI_REQUESTS=true
```

### Variables de Entorno (Frontend)

```bash
# .env.local en /frontend
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### Límites

- **Tamaño máximo por archivo**: 10MB
- **Archivos por batch**: 50
- **Formatos soportados**: Solo PDF
- **Tokens OpenAI**: Varía según documento (~1000-50000 tokens por documento)

## 🔄 Flujo de Procesamiento

```
1. Usuario selecciona carpeta/archivos
   ↓
2. Frontend sube a Supabase Storage
   ↓
3. Backend recibe archivos
   ↓
4. Para cada archivo:
   a. Ingestion: Extrae texto del PDF
   b. Classification: IA clasifica el tipo
   c. Extraction: IA extrae campos estructurados
   d. Validation: Valida datos extraídos
   ↓
5. Backend guarda metadata en DB
   ↓
6. Frontend muestra resultados
```

## 📈 Métricas y Logs

El sistema registra métricas detalladas:

```javascript
{
  batchId: "batch_...",
  totalFiles: 6,
  successCount: 5,
  errorCount: 1,
  duration: 45000,  // ms
  totalTokens: 50000,
  byDocumentType: {
    "closing_alta": 2,
    "home_owner_insurance": 1,
    "tax_bill": 1
  }
}
```

Ver logs en:
- **Backend**: Consola del servidor (nodemon)
- **Frontend**: Console del navegador (F12)
- **AI Pipeline**: `backend/ai-pipeline/cache/*.json`

## 🐛 Troubleshooting

### Error: "Only PDF files are allowed"
**Solución**: Asegúrate de que todos los archivos sean PDFs válidos.

### Error: "AI processing failed"
**Solución**:
- Verifica que `OPENAI_API_KEY` esté configurada
- Revisa los límites de tokens de tu cuenta OpenAI
- Verifica la conectividad a internet

### Error: "Document processing not completed"
**Solución**: Espera más tiempo, algunos documentos grandes pueden tardar 1-2 minutos.

### Advertencia: "Low confidence"
**Solución**:
- El documento puede estar escaneado sin OCR
- El formato puede ser no estándar
- Revisa manualmente los datos extraídos

## 📝 Próximas Mejoras

- [ ] Soporte para OCR en documentos escaneados
- [ ] Procesamiento paralelo de documentos
- [ ] Merge automático de datos de múltiples documentos
- [ ] Detección de documentos duplicados
- [ ] Exportar resultados a Excel/CSV
- [ ] Edición manual de datos extraídos
- [ ] Integración con otros providers de IA (Claude, Gemini)

## 🤝 Contribuir

Para agregar un nuevo tipo de documento:

1. Define el tipo en `backend/ai-pipeline/classification/document-types.js`
2. Crea un extractor en `backend/ai-pipeline/extraction/extractors/`
3. Actualiza prompts en `backend/ai-pipeline/classification/prompts.js`
4. Agrega reglas de validación en `backend/ai-pipeline/validation/rules.js`
5. Actualiza la documentación

## 📚 Referencias

- [AI Pipeline Architecture](backend/ai-pipeline/ARCHITECTURE.md)
- [AI Pipeline README](backend/ai-pipeline/README.md)
- [Database Schema](schema.sql)
- [API Documentation](documentos/README.md)
