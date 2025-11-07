# 🏗️ Arquitectura del Pipeline de IA para Documentos Inmobiliarios

## 📋 Visión General

Sistema de ingesta, clasificación, extracción y persistencia de documentos inmobiliarios usando IA, con trazabilidad completa y normalización robusta.

## 🎯 Tipos de Documentos Soportados

1. **Closing/ALTA Statement** - Documento de cierre de transacción
2. **First Payment Information Letter** - Carta de información del primer pago
3. **Initial Escrow Disclosure** - Divulgación inicial de escrow
4. **HOI (Home Owner Insurance)** - Póliza de seguro de propietario
5. **Exhibit A** - Anexo A (descripción legal de propiedad)
6. **Tax Bill** - Factura de impuestos
7. **Lease Agreement** - Contrato de arrendamiento
8. **Mortgage Statement** - Estado de cuenta hipotecario

## 🔄 Pipeline de Procesamiento

```
┌─────────────────┐
│  PDF Upload     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  1. Ingestion   │ ← Extracción de texto, metadatos, páginas
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Classifier   │ ← IA identifica tipo de documento
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Extraction   │ ← Extractor especializado por tipo
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Validation   │ ← Normalización y validación de datos
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Persistence  │ ← Guardado en DB con trazabilidad
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. Response    │ ← JSON estructurado + metadatos
└─────────────────┘
```

## 📊 Estructura de Datos

### Documento Procesado
```typescript
interface ProcessedDocument {
  // Identificación
  document_id: string;
  property_id?: string;
  
  // Clasificación
  document_type: DocumentType;
  classification_confidence: number;
  
  // Contenido
  raw_text: string;
  pages: Page[];
  
  // Extracción
  extracted_data: Record<string, any>;
  extraction_confidence: number;
  
  // Trazabilidad
  source: {
    filename: string;
    upload_date: Date;
    file_hash: string;
    file_size: number;
  };
  
  // Procesamiento
  processing: {
    started_at: Date;
    completed_at: Date;
    duration_ms: number;
    ai_model: string;
    ai_tokens_used: number;
  };
  
  // Validación
  validation: {
    is_valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  };
}

interface Page {
  page_number: number;
  text: string;
  extracted_fields: ExtractedField[];
}

interface ExtractedField {
  field_name: string;
  value: any;
  confidence: number;
  source_page: number;
  source_text: string;
  normalized_value?: any;
}
```

## 🤖 Integración con IA

### Proveedor: OpenAI GPT-4 / Anthropic Claude

**Clasificador:**
```
Prompt: "Classify this real estate document into one of these types: 
[Closing/ALTA, First Payment Letter, Escrow Disclosure, HOI, 
Exhibit A, Tax Bill, Lease, Mortgage Statement]. 
Return JSON with type and confidence."
```

**Extractor:**
```
Prompt: "Extract structured data from this {document_type}. 
Return JSON with all relevant fields, confidence scores, 
and source page numbers."
```

## 🗄️ Esquema de Base de Datos

```sql
-- Tabla principal de documentos
CREATE TABLE documents (
  document_id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(property_id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Clasificación
  document_type VARCHAR(50) NOT NULL,
  classification_confidence DECIMAL(5,4),
  
  -- Archivo
  filename VARCHAR(255),
  file_hash VARCHAR(64) UNIQUE,
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- Procesamiento
  status VARCHAR(20), -- pending, processing, completed, failed
  ai_model VARCHAR(50),
  ai_tokens_used INTEGER,
  processing_duration_ms INTEGER,
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Metadatos
  metadata JSONB,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Tabla de páginas
CREATE TABLE document_pages (
  page_id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text TEXT,
  metadata JSONB,
  
  UNIQUE(document_id, page_number)
);

-- Tabla de campos extraídos
CREATE TABLE extracted_fields (
  field_id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
  page_id UUID REFERENCES document_pages(page_id),
  
  field_name VARCHAR(100) NOT NULL,
  field_value TEXT,
  normalized_value JSONB,
  
  confidence DECIMAL(5,4),
  source_text TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de validaciones
CREATE TABLE document_validations (
  validation_id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE,
  
  is_valid BOOLEAN,
  validation_type VARCHAR(20), -- error, warning, info
  field_name VARCHAR(100),
  message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_documents_property ON documents(property_id);
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_hash ON documents(file_hash);
CREATE INDEX idx_extracted_fields_document ON extracted_fields(document_id);
CREATE INDEX idx_extracted_fields_name ON extracted_fields(field_name);
```

## 📁 Estructura de Archivos

```
backend/
└── ai-pipeline/
    ├── ARCHITECTURE.md          # Este archivo
    ├── index.js                 # Punto de entrada del pipeline
    ├── config.js                # Configuración (API keys, modelos)
    │
    ├── ingestion/
    │   ├── pdf-processor.js     # Extracción de texto y páginas
    │   └── metadata-extractor.js # Extracción de metadatos
    │
    ├── classification/
    │   ├── classifier.js        # Clasificador principal
    │   ├── prompts.js           # Prompts para IA
    │   └── document-types.js    # Definiciones de tipos
    │
    ├── extraction/
    │   ├── extractor-factory.js # Factory de extractores
    │   ├── extractors/
    │   │   ├── closing-extractor.js
    │   │   ├── payment-letter-extractor.js
    │   │   ├── escrow-extractor.js
    │   │   ├── hoi-extractor.js
    │   │   ├── exhibit-a-extractor.js
    │   │   ├── tax-bill-extractor.js
    │   │   ├── lease-extractor.js
    │   │   └── mortgage-statement-extractor.js
    │   └── base-extractor.js    # Clase base
    │
    ├── validation/
    │   ├── validator.js         # Validador principal
    │   ├── normalizers.js       # Normalizadores de datos
    │   └── rules.js             # Reglas de validación
    │
    ├── persistence/
    │   ├── document-repository.js
    │   └── field-repository.js
    │
    ├── ai/
    │   ├── openai-client.js     # Cliente OpenAI
    │   ├── anthropic-client.js  # Cliente Anthropic
    │   └── ai-factory.js        # Factory de clientes IA
    │
    └── utils/
        ├── logger.js            # Sistema de logging
        ├── tracer.js            # Trazabilidad
        └── cache.js             # Cache de resultados
```

## 🔐 Seguridad y Privacidad

- Todos los documentos se asocian a un `user_id`
- Row Level Security (RLS) en Supabase
- Encriptación de datos sensibles
- Logs de auditoría para todas las operaciones
- Rate limiting en API endpoints

## 📈 Métricas y Monitoreo

- Tiempo de procesamiento por documento
- Tokens de IA consumidos
- Tasa de éxito de clasificación
- Confianza promedio de extracción
- Errores de validación más comunes

## 🚀 API Endpoints

```
POST   /api/ai-pipeline/process          # Procesar documento
GET    /api/ai-pipeline/status/:id       # Estado de procesamiento
GET    /api/ai-pipeline/result/:id       # Resultado completo
POST   /api/ai-pipeline/reprocess/:id    # Reprocesar documento
DELETE /api/ai-pipeline/document/:id     # Eliminar documento
GET    /api/ai-pipeline/documents        # Listar documentos
GET    /api/ai-pipeline/stats            # Estadísticas
```

## 🎯 Próximos Pasos

1. ✅ Arquitectura definida
2. ⏳ Implementar clasificador
3. ⏳ Implementar extractores
4. ⏳ Integrar IA
5. ⏳ Crear validadores
6. ⏳ Implementar persistencia
7. ⏳ Crear API endpoints
8. ⏳ Testing y optimización