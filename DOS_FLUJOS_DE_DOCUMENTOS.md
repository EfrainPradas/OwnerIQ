# 📄 Dos Flujos de Procesamiento de Documentos

El sistema ahora tiene **DOS flujos separados** para manejar documentos con AI:

---

## 🆕 FLUJO 1: Crear Nueva Propiedad desde Documentos

**Ubicación**: Pantalla principal de propiedades (antes de tener una propiedad)

**Componentes**:
- `AIPDFUploader.js`
- `PropertyDocumentWizard.js`

**Uso**:
1. El usuario **NO tiene** una propiedad todavía
2. Sube documentos (Closing, ALTA, Warranties)
3. El sistema **CREA una nueva propiedad** con los datos extraídos
4. Los documentos se procesan para poblar los campos de la propiedad

**Flujo**:
```
Usuario sin propiedad
↓
Sube: Closing Doc + ALTA + Warranties
↓
AI extrae: precio, dirección, préstamo, seguro, etc.
↓
Sistema CREA nueva propiedad con esos datos
↓
Usuario ahora tiene una propiedad completa
```

**Botón**: "Process with AI" (crea propiedad)

---

## 📁 FLUJO 2: Agregar Documentos a Propiedad Existente

**Ubicación**: Dentro de la vista de detalles de una propiedad existente → pestaña "Documents"

**Componente**:
- `PropertyDocumentBulkUpload.js` (NUEVO)

**Uso**:
1. El usuario **YA TIENE** una propiedad creada
2. Quiere agregar más documentos a esa propiedad
3. Sube carpeta completa o archivos múltiples
4. Los documentos se clasifican y almacenan
5. La propiedad **NO se modifica**, solo se agregan documentos

**Flujo**:
```
Usuario con propiedad existente
↓
Entra a Property Details → Documents
↓
Click en "Bulk Upload Additional Documents"
↓
Selecciona carpeta completa de PDFs
↓
AI clasifica cada documento (Insurance, Tax, Lease, etc.)
↓
Documentos se guardan en Supabase Storage
↓
Metadatos se guardan en property_document
↓
Usuario puede ver/descargar documentos clasificados
```

**Botón**: "Bulk Upload Additional Documents" (solo agrega docs)

---

## 🎯 Diferencias Clave

| Aspecto | Flujo 1: Crear Propiedad | Flujo 2: Agregar Docs |
|---------|-------------------------|---------------------|
| **Cuándo** | Antes de tener propiedad | Con propiedad existente |
| **Propósito** | Crear nueva propiedad | Agregar documentos adicionales |
| **Documentos** | 3 tipos específicos | Cualquier PDF |
| **Límite** | 3 archivos | Hasta 50 archivos |
| **Resultado** | Nueva propiedad creada | Documentos clasificados y guardados |
| **Modifica propiedad** | ✅ Crea con datos extraídos | ❌ Solo agrega documentos |
| **UI** | Wizard paso a paso | Botón colapsable simple |
| **Ubicación** | Pantalla principal | Dentro de property details |

---

## 🔄 Ejemplo de Uso Completo

### Paso 1: Crear Propiedad (Flujo 1)

```
1. Usuario nuevo sin propiedades
2. Click en "Add Property with AI"
3. Sube:
   - Closing Doc (extrae precio, fecha)
   - ALTA Statement (extrae prestamista, préstamo)
   - HOI Quote (extrae seguro)
4. Sistema crea propiedad "123 Main St"
5. Campos poblados automáticamente
```

### Paso 2: Agregar Más Documentos (Flujo 2)

```
1. Usuario entra a "123 Main St" → Documents
2. Click en "Bulk Upload Additional Documents"
3. Selecciona carpeta con:
   - Tax Bills (2024, 2023)
   - Lease Agreements
   - Mortgage Statements
   - Maintenance Records
   - Surveys
4. AI clasifica cada uno automáticamente
5. Documentos aparecen en lista organizada
6. Propiedad NO se modifica
```

---

## 💡 Casos de Uso

### ¿Cuándo usar Flujo 1?

- ✅ Acabas de comprar una propiedad
- ✅ Tienes los documentos de cierre
- ✅ Quieres que el sistema llene automáticamente los campos
- ✅ Es tu primera propiedad en el sistema

### ¿Cuándo usar Flujo 2?

- ✅ Ya tienes la propiedad en el sistema
- ✅ Recibes nuevos documentos (tax bills, invoices)
- ✅ Quieres organizar documentos históricos
- ✅ Necesitas subir múltiples archivos de una vez
- ✅ Solo quieres almacenar y clasificar, no modificar datos

---

## 🧪 Cómo Probar

### Probar Flujo 1 (Crear Propiedad)

**MANTENER ACTUAL - NO CAMBIAR**

1. Ve a pantalla principal
2. Usa el wizard existente
3. Sube 3 documentos
4. Verifica que se crea la propiedad

### Probar Flujo 2 (Agregar Docs) - NUEVO

1. Ve a http://localhost:3000
2. Entra a una propiedad existente
3. Click en pestaña "Documents"
4. Verás botón azul: "Bulk Upload Additional Documents"
5. Click en el botón (se expande)
6. Opciones:
   - "📂 Select Folder" - para carpeta completa
   - "📄 Select Files" - para archivos individuales
7. Selecciona documentos de prueba
8. Click "🚀 Upload & Process"
9. Espera procesamiento (30-60 seg por doc)
10. Verás resultados:
    - Documentos clasificados por tipo
    - Confianza de clasificación
    - Campos extraídos
11. Click "Done"
12. Documentos aparecen en la lista abajo

---

## 🔧 Archivos Técnicos

### Flujo 1 (Existente)
```
frontend/src/components/
├── AIPDFUploader.js
├── PropertyDocumentWizard.js
└── PDFUploader.js
```

### Flujo 2 (Nuevo)
```
frontend/src/components/
└── PropertyDocumentBulkUpload.js  ← NUEVO

backend/routes/
└── ai-pipeline.js
    └── POST /api/ai-pipeline/process-batch  ← NUEVO ENDPOINT
```

---

## 📊 Base de Datos

Ambos flujos guardan en la misma tabla:

```sql
property_document
├── document_id
├── property_id  ← Diferencia principal
├── document_type (clasificado por AI)
├── file_path (Supabase Storage)
├── metadata (JSONB con info de AI)
└── uploaded_by
```

**Flujo 1**: `property_id` se crea durante el proceso
**Flujo 2**: `property_id` ya existe, solo se agregan registros

---

## ⚙️ Configuración Actual

### Backend
✅ Endpoint batch processing funcionando
✅ Soporta hasta 50 archivos
✅ Clasifica automáticamente 8+ tipos

### Frontend
✅ Componente PropertyDocumentBulkUpload creado
✅ Integrado en PropertyDocuments
✅ UI colapsable y simple
✅ Progreso en tiempo real

### Base de Datos
⚠️ Requiere migración: agregar campo `metadata`

---

## 📝 Para Migrar a Producción

1. ✅ Código backend listo
2. ✅ Código frontend listo
3. ⚠️ Ejecutar migración SQL:
   ```sql
   ALTER TABLE property_document ADD COLUMN metadata JSONB;
   ```
4. ✅ Documentación completa
5. ✅ Ambos flujos separados y claros

---

## 🎉 Beneficios

### Usuario Final
- 📝 **Flujo 1**: Onboarding rápido de nuevas propiedades
- 📁 **Flujo 2**: Gestión documental eficiente de propiedades existentes

### Sistema
- 🔄 Flujos separados = menos confusión
- 🧩 Componentes modulares = fácil mantenimiento
- 📊 Misma base de datos = datos unificados
- 🤖 Misma IA = clasificación consistente

---

¿Listo para probar? Ejecuta la migración SQL y abre http://localhost:3000 🚀
