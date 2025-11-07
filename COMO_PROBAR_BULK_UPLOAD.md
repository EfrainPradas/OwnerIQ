# 🚀 Cómo Probar la Funcionalidad de Bulk Upload

## ✅ Estado Actual

- ✅ **Backend**: Corriendo en puerto 5000 con endpoint `/api/ai-pipeline/process-batch`
- ✅ **Frontend**: Compilando correctamente en http://localhost:3000
- ✅ **Componente**: BulkDocumentUploader integrado en PropertyDocuments
- ⚠️ **Base de Datos**: Necesita agregar campo `metadata`

---

## 📋 Pasos para Probar

### 1. Actualizar Base de Datos (IMPORTANTE)

Ve a **Supabase Dashboard → SQL Editor** y ejecuta:

```sql
-- Agregar campo metadata
ALTER TABLE property_document ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Crear índice
CREATE INDEX IF NOT EXISTS idx_property_document_metadata
ON property_document USING GIN (metadata);
```

O simplemente copia y pega el contenido del archivo `ADD_METADATA_COLUMN.sql`

---

### 2. Abrir la Aplicación

1. Abre tu navegador en: **http://localhost:3000**
2. Inicia sesión con tu cuenta
3. Ve a la sección de **Properties** (Propiedades)

---

### 3. Seleccionar una Propiedad

1. Haz clic en cualquier propiedad de la lista
2. En el menú de pestañas, selecciona **"Documents"**

---

### 4. Usar Bulk Upload

Ahora verás una nueva sección al inicio llamada:
**"📁 Bulk Document Upload & AI Processing"**

#### Opción A: Subir Carpeta Completa

1. Haz clic en el botón verde **"📂 Select Folder"**
2. Selecciona la carpeta con los documentos PDF
3. Verás la lista de archivos detectados
4. Haz clic en **"🚀 Upload & Process with AI"**

#### Opción B: Subir Archivos Individuales

1. Haz clic en el botón azul **"📄 Select Files"**
2. Selecciona uno o más archivos PDF
3. Verás la lista de archivos seleccionados
4. Haz clic en **"🚀 Upload & Process with AI"**

---

### 5. Ver el Progreso

Verás 3 etapas de progreso:

```
📤 Uploading to Storage... (1/6)
↓
🤖 Processing with AI... (3/6)
↓
💾 Saving to Database... (6/6)
```

**Tiempo estimado**: 30-60 segundos por documento

---

### 6. Ver Resultados

Al finalizar verás:

#### Estadísticas Generales
```
✅ Successful: 5
❌ Failed: 1
⏱️ Duration: 45.3s
```

#### Documentos por Tipo
```
Closing/ALTA Statement      [2]
Home Owner Insurance       [1]
Tax Bill                   [1]
Unclassified Document      [1]
```

#### Detalle por Documento
```
📄 03.31.25 Signed ALTA.pdf
   Type: Closing/ALTA Statement
   Confidence: 95%
   Fields Extracted: 42
   Status: ✓ Valid
```

---

## 🧪 Documentos de Prueba

Puedes usar los documentos que ya procesamos antes:

```bash
/mnt/c/Users/ADM/Downloads/11127 Kimberly Ave - DUPLEX DOCUMENTS-20251023T020859Z-1-001/11127 Kimberly Ave - DUPLEX DOCUMENTS/

Archivos disponibles:
├── 03.31.25 Signed ALTA - 11127 Kimberly Ave.pdf
├── 03.25.25 HOI Quote 11127 Kimberly-Florida Peninsula.pdf
├── 12.05.24 AMEX CC 61008-Payment 2024 PT Charlotte-11127 Kimberly.pdf
├── 07.23.25 11127 kimberly CO.pdf
├── Closing Docs - Kissimmee Lux (11127-11129 Kimberly Ave).pdf
└── Survey.pdf
```

**Ruta en Windows**:
```
C:\Users\ADM\Downloads\11127 Kimberly Ave - DUPLEX DOCUMENTS-20251023T020859Z-1-001\11127 Kimberly Ave - DUPLEX DOCUMENTS
```

---

## 🔍 Verificar que Funcionó

### En la Aplicación

1. Los documentos aparecerán en la lista de "Uploaded Documents"
2. Cada documento tendrá:
   - ✅ Tipo clasificado (ej: "Closing/ALTA Statement")
   - ✅ Descripción con confianza (ej: "AI Classified: closing_alta (95% confidence)")
   - ✅ Fecha de carga
   - ✅ Tamaño del archivo

### En Supabase

1. Ve a **Table Editor → property_document**
2. Verás los nuevos documentos con:
   - `document_type`: Tipo clasificado por IA
   - `metadata`: JSON con información del procesamiento
   - `file_path`: Ruta en Storage

3. Ve a **Storage → OwnerIQ → property-documents**
4. Verás los PDFs subidos organizados por property_id

---

## 🐛 Troubleshooting

### "No veo el componente Bulk Upload"

**Solución**:
- Refresca la página (Ctrl+R o Cmd+R)
- Verifica que estés en la pestaña "Documents"
- Abre la consola del navegador (F12) y busca errores

### "Error: Only PDF files are allowed"

**Solución**:
- Asegúrate de que todos los archivos sean PDF
- Algunos navegadores no soportan la selección de carpetas completas (usa "Select Files" en su lugar)

### "AI processing failed"

**Solución**:
- Verifica que el backend esté corriendo (puerto 5000)
- Verifica la variable `OPENAI_API_KEY` en `backend/.env`
- Revisa la consola del backend para ver el error específico

### "Document processing not completed"

**Solución**:
- Documentos grandes pueden tardar 1-2 minutos
- Espera un poco más y refresca
- Si persiste, revisa la consola del backend

---

## 📊 Datos de Ejemplo Esperados

Si subes los 6 documentos de "11127 Kimberly Ave", deberías ver:

```json
{
  "successful": 4-6,
  "by_document_type": {
    "closing_alta": 1-2,
    "home_owner_insurance": 1,
    "tax_bill": 1,
    "unknown": 1-2
  }
}
```

**Datos extraídos típicos**:
- Dirección completa de la propiedad
- Precio de compra
- Información de préstamo
- Prima anual de seguro
- Impuestos anuales
- Información del propietario
- Detalles de construcción

---

## 🎥 Demo en Video

Si necesitas ayuda visual, puedo guiarte paso a paso en tiempo real.

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa los logs del backend en la terminal
2. Revisa la consola del navegador (F12)
3. Verifica las variables de entorno
4. Comparte el error específico que ves

---

## 🎯 Próximo Paso

Una vez que confirmes que funciona, podemos:
- Ajustar el diseño de la interfaz
- Agregar más tipos de documentos soportados
- Implementar merge automático de datos
- Mejorar la visualización de resultados
