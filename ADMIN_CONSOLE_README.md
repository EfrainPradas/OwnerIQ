# 🔐 Consola de Administración - OwnerIQ

## ✅ ¿Qué se creó?

Se ha implementado una **consola de administración completa** accesible desde:
```
http://localhost:3004/admin
```

## 🎯 Características

### 1. **Dashboard deAdministración**
- ✅ Lista de todos los usuarios/clientes
- ✅ Ver batches de cada usuario
- ✅ Ver documentos por batch
- ✅ Botón "Extraer con AI" por documento
- ✅ Estados en tiempo real (PENDING → PROCESSING → PROCESSED)

### 2. **Event Logs**
- ✅ Movido desde la app principal a admin
- ✅ Timeline completo de eventos
- ✅ Filtros por categoría y tiempo
- ✅ Stats en tiempo real

## 📁 Archivos Creados

### Frontend
```
frontend/src/
├── views/
│   ├── AdminView.js          # Vista principal de admin
│   └── AdminView.css          # Estilos de admin
└── components/
    └── Admin/
        ├── AdminDashboard.js  # Dashboard principal
        └── AdminDashboard.css # Estilos del dashboard
```

### Backend
```
backend/routes/
└── admin.js                   # API para procesar docs con AI
```

## 🚀 Cómo Usar

### 1. Acceder a la consola
1. Inicia la app: `http://localhost:3004`
2. Haz login
3. Click en el botón **🔐 Admin** (rojo, en la navegación)

### 2. Ver clientes y documentos
1. En la sidebar izquierda, verás la lista de usuarios
2. Click en un usuario para ver sus datos
3. Verás sus batches y documentos

### 3. Procesar documentos con AI
1. Selecciona un usuario
2. Encuentra un documento con status `PENDING` o `UPLOADED`
3. Click en **🤖 Extraer con AI**
4. Espera a que termine (status cambia a `PROCESSED`)

### 4. Ver event logs
1. En admin, click en tab **📝 Event Logs**
2. Verás todos los eventos del sistema
3. Filtra por categoría, tipo o tiempo

## 🔄 Flujo de Procesamiento

```
Usuario sube documento
    ↓
Status: PENDING
    ↓
Se guarda en Storage ✅
    ↓
Admin ve el documento
    ↓
Click "Extraer con AI"
    ↓
Status: PROCESSING
    ↓
AI extrae información
    ↓
Status: PROCESSED ✅
    ↓
Datos guardados en database
```

## 🎨 Características del UI

### Dashboard Admin
- ✅ Tema oscuro premium
- ✅ Sidebar con lista de usuarios
- ✅ Avatar con iniciales
- ✅ Status badges coloridos
- ✅ Grid de documentos
- ✅ Botones de acción por documento
- ✅ Loading states y feedback

### Event Logs
- ✅ Same UI existente
- ✅ Timeline visual
- ✅ Filtros avanzados
- ✅ Auto-refresh

## 📊 API Endpoints

### POST `/api/admin/process-document`
Procesa un documento manualmente con AI.

**Request:**
```json
{
  "document_id": "uuid-del-documento"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document processed successfully",
  "extracted_data": {...},
  "document_type": "closing",
  "confidence": 0.95
}
```

**Errores comunes:**
- `400`: `document_id` faltante
- `404`: Documento no encontrado
- `500`: Error en AI o Storage

## ⚙️ Configuración

### Procesamiento AI
El procesamiento AI usa la función existente en `ai-pipeline/index.js`.

**Requisitos:**
- `OPENAI_API_KEY` en `.env`
- Documentos en formato PDF
- Storage bucket configurado

### Habilitar/Deshabilitar
El procesamiento AI está **deshabilitado** por defecto en uploads automáticos.
Solo se procesa manualmente desde el admin.

Para habilitar automático:
1. Configura `OPENAI_API_KEY`
2. Descomenta código en `routes/onboarding.js` (líneas ~710-780)

## 🛡️ Seguridad

### Acceso
Por ahora, cualquier usuario autenticado puede acceder al admin.

**Para producción, agrega validación:**
```javascript
// En AdminView.js, al inicio
useEffect(() => {
  const user = await supabase.auth.getUser();
  if (user.email !== 'tu-email-admin@example.com') {
    navigate('/dashboard');
  }
}, []);
```

O crea campo `is_admin` en tabla `user_profiles`.

## 📝 Cambios en la App Principal

### Quitado de navegación principal:
- ❌ Event Logs (movido a admin)

### Agregado a navegación principal:
- ✅ Botón 🔐 Admin (rojo)

## 🐛 Troubleshooting

### No funciona el botón "Extraer con AI"
1. Verifica que `OPENAI_API_KEY` esté en `.env``
2. Revisa consola del backend para errores
3. Asegúrate que el documento exista en Storage

### No veo usuarios en Admin
1. Verifica que haya usuarios en `user_profiles`
2. Revisa permisos RLS en Supabase
3. Check consola del navegador para errores

### Error 401 en API de OpenAI
- API key inválida o expirada
- Sin créditos en cuenta de OpenAI
- Revisar `.env` y reiniciar backend

## 🔮 Próximas Mejoras

Ideas para futuras features:
- [ ] Autenticación de admin (solo emails específicos)
- [ ] Editar datos extraídos manualmente
- [ ] Exportar datos a CSV/Excel
- [ ] Dashboard de analytics
- [ ] Logs de acciones de admin
- [ ] Bulk processing (procesar múltiples docs)
- [ ] Preview del PDF en el admin
- [ ] Comparar versiones de extracción

## 📞 Soporte

Para preguntas: Revisa el código o consulta la documentación existente en:
- `EVENT_LOGGING_DOCUMENTATION.md`
- `EVENT_LOGGING_INTEGRATION_GUIDE.md`
