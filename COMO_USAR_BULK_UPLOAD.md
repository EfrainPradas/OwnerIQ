# 📁 Cómo Usar el Componente de Bulk Upload

## 🎯 Propósito

El componente `PropertyDocumentBulkUpload` permite agregar **múltiples documentos** a una **propiedad existente** de forma masiva.

**NO** reemplaza el flujo de creación de propiedades con AI.

---

## 📦 Ubicación del Componente

```
frontend/src/components/PropertyDocumentBulkUpload.js
```

---

## 🔧 Cómo Integrarlo

### Opción 1: Como Card Independiente (Recomendado)

Colócalo **FUERA y ANTES** del card de "Documents" en la vista de detalles de propiedad:

```jsx
import PropertyDocumentBulkUpload from './PropertyDocumentBulkUpload';

function PropertyDetailView({ propertyId, userId }) {
  return (
    <div>
      {/* Otras secciones (Info, Financial, etc.) */}

      {/* 👇 BULK UPLOAD - FUERA DEL CARD */}
      <PropertyDocumentBulkUpload
        propertyId={propertyId}
        userId={userId}
        onComplete={(results) => {
          console.log('Documentos procesados:', results);
          // Recargar lista de documentos
          fetchDocuments();
        }}
      />

      {/* 👇 CARD DE DOCUMENTOS EXISTENTE */}
      <PropertyDocuments propertyId={propertyId} userId={userId} />

    </div>
  );
}
```

### Opción 2: En una Nueva Pestaña

Crea una pestaña separada "Bulk Upload" o "Add Documents":

```jsx
<Tabs>
  <Tab label="Property Info">...</Tab>
  <Tab label="Documents">
    <PropertyDocuments />
  </Tab>
  <Tab label="Add Multiple Documents">
    <PropertyDocumentBulkUpload />
  </Tab>
</Tabs>
```

### Opción 3: Como Opción en el Menú

Agrégalo como botón de acción principal:

```jsx
<div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
  <button onClick={...}>Edit Property</button>
  <button onClick={() => setShowBulkUpload(true)}>
    Add Multiple Documents
  </button>
</div>

{showBulkUpload && (
  <PropertyDocumentBulkUpload
    propertyId={propertyId}
    userId={userId}
    onComplete={(results) => {
      setShowBulkUpload(false);
      fetchDocuments();
    }}
  />
)}
```

---

## ⚙️ Props del Componente

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `propertyId` | UUID | ✅ | ID de la propiedad existente |
| `userId` | UUID | ✅ | ID del usuario que sube |
| `onComplete` | Function | ❌ | Callback cuando termina el procesamiento |

### Ejemplo del callback:

```javascript
onComplete={(results) => {
  console.log('Archivos procesados:', results.summary.successful);
  console.log('Por tipo:', results.by_document_type);
  console.log('Errores:', results.errors);

  // Actualizar UI
  fetchDocuments();
  showNotification('Documents uploaded successfully!');
}}
```

---

## 🎨 Características del UI

### Estado Inicial (Colapsado)
```
┌──────────────────────────────────────┐
│  [📁] Bulk Upload Additional Documents│
└──────────────────────────────────────┘
```

### Estado Expandido
```
┌────────────────────────────────────────┐
│ 📁 Add Multiple Documents to Property  │
│ ✕ Close                                 │
├────────────────────────────────────────┤
│ Upload PDFs to classify and store...   │
│                                         │
│ [📂 Select Folder]  [📄 Select Files]  │
│                                         │
│ Selected Files (3):                    │
│ • document1.pdf (1.2 MB)      [Remove] │
│ • document2.pdf (800 KB)      [Remove] │
│ • document3.pdf (2.5 MB)      [Remove] │
│                                         │
│ [🚀 Upload & Process (3 files)]        │
└────────────────────────────────────────┘
```

### Durante Procesamiento
```
┌────────────────────────────────────────┐
│         🤖 AI Processing...             │
│              2 / 3                      │
│  ▓▓▓▓▓▓▓▓▓▓▓░░░░░                      │
└────────────────────────────────────────┘
```

### Resultado Final
```
┌────────────────────────────────────────┐
│ ✅ Processed 3 documents successfully!  │
│                                         │
│ Closing/ALTA: 1  Insurance: 1  Tax: 1  │
│                                         │
│ [Done]                                  │
└────────────────────────────────────────┘
```

---

## 🔄 Flujo Completo

```
1. Usuario en Property Detail View
   ↓
2. Ve botón "Bulk Upload Additional Documents"
   ↓
3. Click → Se expande el componente
   ↓
4. Selecciona carpeta o archivos PDF
   ↓
5. Ve lista de archivos seleccionados
   ↓
6. Click "Upload & Process"
   ↓
7. Sistema:
   a. Sube a Supabase Storage
   b. Procesa con AI (clasifica + extrae)
   c. Guarda en property_document
   ↓
8. Usuario ve resultados:
   - Documentos por tipo
   - Confianza de clasificación
   - Errores si los hay
   ↓
9. Click "Done" → Componente se colapsa
   ↓
10. Lista de documentos se actualiza automáticamente
```

---

## 📊 Tipos de Documentos Clasificados

El componente clasificará automáticamente:

- ✅ Closing/ALTA Statement
- ✅ Home Owner Insurance
- ✅ Tax Bill
- ✅ Lease Agreement
- ✅ Mortgage Statement
- ✅ First Payment Letter
- ✅ Initial Escrow
- ✅ Exhibit A
- ✅ Other (no clasificado)

---

## 🐛 Errores Corregidos

### ❌ Error anterior: "File too large"
**Causa**: Límite de 10MB por archivo
**Solución**: Aumentado a 50MB por archivo

### ❌ Error anterior: 500 Internal Server Error
**Causa**: Configuración de multer
**Solución**: Ajustado `uploadMultiple` con límites correctos

---

## ⚡ Límites Actuales

| Límite | Valor |
|--------|-------|
| Tamaño máximo por archivo | 50 MB |
| Archivos por batch | 50 |
| Formato soportado | Solo PDF |
| Tiempo por documento | 30-60 segundos |

---

## 🧪 Ejemplo de Uso Completo

```jsx
import React, { useState } from 'react';
import PropertyDocumentBulkUpload from './PropertyDocumentBulkUpload';
import PropertyDocuments from './PropertyDocuments';

function PropertyDetailView({ property, user }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ padding: '20px' }}>

      {/* Información de la propiedad */}
      <div className="property-info-card">
        <h2>{property.address}</h2>
        <p>Value: ${property.valuation}</p>
      </div>

      {/* 👇 BULK UPLOAD - Como card independiente */}
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <PropertyDocumentBulkUpload
          propertyId={property.property_id}
          userId={user.id}
          onComplete={(results) => {
            console.log(`✅ ${results.summary.successful} documents uploaded`);
            // Forzar recarga de documentos
            setRefreshKey(prev => prev + 1);
            // Notificación
            alert(`Successfully processed ${results.summary.successful} documents!`);
          }}
        />
      </div>

      {/* 👇 Lista de documentos existente */}
      <PropertyDocuments
        key={refreshKey}
        propertyId={property.property_id}
        userId={user.id}
      />

    </div>
  );
}
```

---

## 📝 Notas Importantes

1. **Propiedad debe existir**: El componente requiere un `propertyId` válido
2. **No modifica la propiedad**: Solo agrega documentos, no cambia datos
3. **Diferente del wizard**: El wizard crea propiedades, este solo agrega docs
4. **Colapsable por defecto**: No ocupa espacio hasta que se expande
5. **Procesamiento asíncrono**: Cada documento toma 30-60 segundos

---

## ✅ Checklist de Integración

- [ ] Importar el componente
- [ ] Pasarle `propertyId` y `userId`
- [ ] Agregar callback `onComplete` para actualizar UI
- [ ] Ejecutar migración SQL (`ADD_METADATA_COLUMN.sql`)
- [ ] Probar con carpeta de documentos de ejemplo
- [ ] Verificar que documentos aparezcan en la lista

---

## 🎯 Resultado Esperado

Después de usar el bulk upload:

1. ✅ Todos los PDFs en Supabase Storage
2. ✅ Registros en tabla `property_document`
3. ✅ Cada documento clasificado automáticamente
4. ✅ Metadata con info de AI guardada
5. ✅ Documentos visibles en lista de PropertyDocuments
6. ✅ Puede descargar/ver cada documento

---

¿Listo para integrarlo? 🚀

Recuerda:
1. Ejecuta `ADD_METADATA_COLUMN.sql` primero
2. Backend se reinició con límite de 50MB
3. Componente está listo en `PropertyDocumentBulkUpload.js`
