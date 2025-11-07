# 🤖 Pipeline de IA para Documentos Inmobiliarios

Sistema completo de ingesta, clasificación, extracción y persistencia de documentos inmobiliarios usando Inteligencia Artificial.

## 📋 Características

- ✅ **Clasificación Automática** - Identifica el tipo de documento usando IA
- ✅ **Extracción Estructurada** - Extrae datos con confianza y trazabilidad
- ✅ **8 Tipos de Documentos** - Soporta documentos comunes de bienes raíces
- ✅ **Trazabilidad Completa** - Documento/Página/Confianza para cada campo
- ✅ **Validación Robusta** - Normalización y validación de datos extraídos
- ✅ **Persistencia en DB** - Esquema completo con RLS en Supabase
- ✅ **Logging Detallado** - Sistema de auditoría y monitoreo
- ✅ **Cache Inteligente** - Evita reprocesar documentos duplicados

## 🎯 Tipos de Documentos Soportados

| Tipo | Código | Descripción |
|------|--------|-------------|
| Closing/ALTA | `closing_alta` | Documento de cierre de transacción |
| First Payment Letter | `first_payment_letter` | Carta de información del primer pago |
| Escrow Disclosure | `escrow_disclosure` | Divulgación inicial de escrow |
| HOI | `home_owner_insurance` | Póliza de seguro de propietario |
| Exhibit A | `exhibit_a` | Anexo A (descripción legal) |
| Tax Bill | `tax_bill` | Factura de impuestos |
| Lease Agreement | `lease_agreement` | Contrato de arrendamiento |
| Mortgage Statement | `mortgage_statement` | Estado de cuenta hipotecario |

## 🔄 Flujo del Pipeline

```
PDF Upload
    ↓
1. INGESTION
   - Extracción de texto
   - Separación por páginas
   - Cálculo de hash
    ↓
2. CLASSIFICATION
   - IA identifica tipo
   - Confianza de clasificación
    ↓
3. EXTRACTION
   - Extractor especializado
   - Campos con confianza
   - Trazabilidad a página
    ↓
4. VALIDATION
   - Normalización de datos
   - Validación de campos
   - Errores y advertencias
    ↓
5. PERSISTENCE
   - Guardado en DB
   - Logs de auditoría
    ↓
JSON Estructurado
```

## 🚀 Instalación

### 1. Instalar Dependencias

```bash
cd backend
npm install openai pdf-parse
```

### 2. Configurar Variables de Entorno

Agregar a `backend/.env`:

```env
# Proveedor de IA (openai o anthropic)
AI_PROVIDER=openai

# API Keys
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# Modelos
AI_CLASSIFIER_MODEL=gpt-4o-mini
AI_EXTRACTOR_MODEL=gpt-4o

# Configuración
ENABLE_AI_CACHE=true
LOG_LEVEL=info
LOG_AI_REQUESTS=true
```

### 3. Crear Esquema de Base de Datos

```bash
# Ejecutar en Supabase SQL Editor
psql -h your-db-host -U postgres -d postgres -f backend/ai-pipeline/schema.sql
```

O copiar y pegar el contenido de `schema.sql` en el SQL Editor de Supabase.

## 💻 Uso

### Uso Básico

```javascript
const DocumentPipeline = require('./ai-pipeline');

const pipeline = new DocumentPipeline();

// Procesar un documento
const result = await pipeline.process('/path/to/document.pdf', {
  metadata: {
    property_id: 'uuid-here',
    user_id: 'uuid-here',
  }
});

console.log('Tipo de documento:', result.document_type);
console.log('Confianza:', result.classification_confidence);
console.log('Datos extraídos:', result.extracted_data);
```

### Resultado del Pipeline

```javascript
{
  document_id: "doc_1234567890_abc123",
  
  // Clasificación
  document_type: "closing_alta",
  classification_confidence: 0.95,
  
  // Contenido
  raw_text: "...",
  pages: [
    {
      page_number: 1,
      text: "...",
      extracted_fields: []
    }
  ],
  
  // Extracción
  extracted_data: {
    loan_number: {
      value: "10004353",
      confidence: 0.98,
      source_text: "Loan No. 10004353",
      source_page: 1
    },
    loan_amount: {
      value: 161000,
      confidence: 0.95,
      source_text: "$161,000.00",
      source_page: 1
    },
    // ... más campos
  },
  extraction_confidence: 0.92,
  
  // Trazabilidad
  source: {
    filename: "closing-doc.pdf",
    file_hash: "abc123...",
    file_size: 1387965,
    page_count: 15
  },
  
  // Procesamiento
  processing: {
    started_at: "2025-01-12T10:00:00Z",
    completed_at: "2025-01-12T10:00:45Z",
    duration_ms: 45000,
    ai_model: "gpt-4o",
    ai_tokens_used: 12500
  },
  
  // Validación
  validation: {
    is_valid: true,
    errors: [],
    warnings: [
      {
        field: "closing_date",
        message: "Low confidence (0.65) for field 'closing_date'",
        type: "LOW_CONFIDENCE"
      }
    ]
  }
}
```

## 🗄️ Estructura de Base de Datos

### Tablas Principales

- **documents** - Documentos procesados
- **document_pages** - Páginas individuales
- **extracted_fields** - Campos extraídos con trazabilidad
- **document_validations** - Errores y advertencias
- **processing_logs** - Logs de auditoría

### Consultas Útiles

```sql
-- Ver todos los documentos de un usuario
SELECT * FROM documents 
WHERE user_id = 'uuid-here' 
ORDER BY uploaded_at DESC;

-- Ver campos extraídos de un documento
SELECT 
  field_name,
  field_value,
  confidence,
  source_page_number
FROM extracted_fields
WHERE document_id = 'doc-uuid-here'
ORDER BY confidence DESC;

-- Estadísticas de procesamiento
SELECT 
  document_type,
  COUNT(*) as count,
  AVG(classification_confidence) as avg_confidence,
  SUM(ai_tokens_used) as total_tokens
FROM documents
WHERE user_id = 'uuid-here'
GROUP BY document_type;
```

## 📊 API Endpoints

### POST /api/ai-pipeline/process

Procesar un documento PDF.

**Request:**
```bash
curl -X POST http://localhost:5000/api/ai-pipeline/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.pdf" \
  -F "property_id=uuid-here"
```

**Response:**
```json
{
  "document_id": "doc_...",
  "document_type": "closing_alta",
  "classification_confidence": 0.95,
  "extracted_data": { ... },
  "validation": { ... }
}
```

### GET /api/ai-pipeline/status/:documentId

Obtener estado de procesamiento.

### GET /api/ai-pipeline/result/:documentId

Obtener resultado completo.

### GET /api/ai-pipeline/documents

Listar documentos del usuario.

### GET /api/ai-pipeline/stats

Estadísticas de procesamiento.

## 🔧 Configuración Avanzada

### Ajustar Confianza Mínima

```javascript
// En config.js
MIN_CLASSIFICATION_CONFIDENCE: 0.7,  // 70%
MIN_EXTRACTION_CONFIDENCE: 0.6,      // 60%
```

### Cambiar Modelo de IA

```javascript
// En config.js
MODELS: {
  CLASSIFIER: 'gpt-4o-mini',  // Más rápido y económico
  EXTRACTOR: 'gpt-4o',        // Más preciso
}
```

### Habilitar Cache

```javascript
// En config.js
ENABLE_CACHE: true,
CACHE_TTL: 3600,  // 1 hora
```

## 📈 Monitoreo y Métricas

### Logs

Los logs se guardan en `backend/ai-pipeline/logs/`:

- `info-YYYY-MM-DD.log` - Logs informativos
- `error-YYYY-MM-DD.log` - Errores
- `warn-YYYY-MM-DD.log` - Advertencias

### Métricas Clave

- **Tiempo de procesamiento** - Duración total del pipeline
- **Tokens consumidos** - Costo de IA por documento
- **Confianza promedio** - Calidad de extracción
- **Tasa de éxito** - Documentos procesados exitosamente

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Test de un documento específico
node backend/ai-pipeline/test-document.js path/to/document.pdf
```

## 🐛 Troubleshooting

### Error: "OPENAI_API_KEY not configured"

Asegúrate de tener la API key en `.env`:
```env
OPENAI_API_KEY=sk-...
```

### Error: "File size exceeds maximum"

Ajusta el límite en `config.js`:
```javascript
MAX_FILE_SIZE: 20 * 1024 * 1024,  // 20MB
```

### Baja confianza en extracción

- Verifica que el PDF tenga texto (no sea imagen escaneada)
- Usa un modelo más potente (gpt-4o en lugar de gpt-4o-mini)
- Revisa los prompts en `openai-client.js`

## 📚 Recursos

- [Documentación OpenAI](https://platform.openai.com/docs)
- [Documentación Supabase](https://supabase.com/docs)
- [pdf-parse](https://www.npmjs.com/package/pdf-parse)

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT License - Ver LICENSE para más detalles

## 👥 Autores

- OwnerIQ Team

## 🔮 Roadmap

- [ ] Soporte para OCR (documentos escaneados)
- [ ] Extracción de tablas
- [ ] Análisis de imágenes en documentos
- [ ] Soporte para más tipos de documentos
- [ ] API de webhooks para notificaciones
- [ ] Dashboard de métricas en tiempo real