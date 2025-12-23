# Sistema de Event Logging para Onboarding

Documentación completa del sistema de auditoría y tracking del flujo de onboarding.

## Tabla de Contenidos
1. [Resumen](#resumen)
2. [Instalación](#instalación)
3. [Tipos de Eventos](#tipos de-eventos)
4. [Uso del API](#uso-del-api)
5. [Consultas Comunes](#consultas-comunes)
6. [Dashboard de Analytics](#dashboard-de-analytics)

---

## Resumen

El sistema de Event Logging registra **cada acción** del usuario durante el proceso de onboarding, incluyendo:
- ✅ Progreso de navegación
- ✅ Uploads de documentos
- ✅ Procesamiento AI
- ✅ Errores y fallos
- ✅ Tiempos de respuesta

### Beneficios
- **Auditoría completa**: Rastrear quién hizo qué y cuándo
- **Debugging**: Identificar dónde falló un usuario
- **Analytics**: Optimizar el flujo basado en datos reales
- **Compliance**: Registros permanentes para cumplimiento regulatorio

---

## Instalación

### Paso 1: Crear la tabla en Supabase

Ejecuta el script `backend/create-onboarding-event-log.sql` en Supabase SQL Editor:

```sql
-- Ver archivo: create-onboarding-event-log.sql
```

### Paso 2: Verificar instalación

El backend ya está configurado con el logger. Solo asegúrate de que la tabla existe:

```sql
SELECT * FROM onboarding_event_log LIMIT 1;
```

---

## Tipos de Eventos

### Navegación (`navigation`)

| Event Type | Descripción | Campos Principales |
|------------|-------------|-------------------|
| `onboarding_started` | Usuario inicia onboarding | `step_number: 1` |
| `step_completed` | Usuario completa un paso | `step_number`, `metadata` |
| `onboarding_completed` | Onboarding finalizado | `batch_id`, `metadata` |

### Upload (`upload`)

| Event Type | Descripción | Campos Principales |
|------------|-------------|-------------------|
| `batch_created` | Nuevo batch creado | `batch_id`, `metadata.property_type` |
| `document_uploaded` | Documento subido exitosamente | `upload_id`, `document_type`, `metadata.size_bytes` |
| `storage_upload_success` | Archivo guardado en Storage | `document_type`, `metadata.storage_path` |

### Procesamiento (`processing`)

| Event Type | Descripción | Campos Principales |
|------------|-------------|-------------------|
| `document_processing_started` | AI comienza extracción | `upload_id`, `document_type` |
| `document_processed` | Documento procesado exitosamente | `upload_id`, `metadata.extracted_fields` |

### Errores (`error`)

| Event Type | Descripción | Campos Principales |
|------------|-------------|-------------------|
| `batch_creation_failed` | Error al crear batch | `error_message`, `error_code` |
| `upload_error` | Fallo en upload de documento | `document_type`, `error_message` |
| `document_processing_failed` | AI falló al procesar | `upload_id`, `error_message` |

---

## Uso del API

### Backend - Registrar Eventos

```javascript
const OnboardingEventLogger = require('./utils/OnboardingEventLogger');
const eventLogger = new OnboardingEventLogger(supabaseClient);

// Ejemplo: Registrar upload exitoso
await eventLogger.logDocumentUploaded(
  userId, 
  batchId, 
  uploadId, 
  'closing', 
  {
    filename: 'Closing_Statement_4a2b0127.pdf',
    size_bytes: 524288,
    storage_path: 'user123/batch456/Closing_Statement_4a2b0127.pdf'
  }
);

// Ejemplo: Registrar error
await eventLogger.logError(
  userId,
  'storage_quota_exceeded',
  'User storage limit of 100MB exceeded',
  { current_usage: 105000000, limit: 100000000 }
);
```

### Frontend - Consultar Logs

```javascript
// Obtener historial del usuario
const { data: events } = await supabase
  .from('onboarding_event_log')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(50);

console.log('Últimos 50 eventos:', events);
```

---

## Consultas Comunes

### 1. Rastrear progreso de un usuario específico

```sql
SELECT 
  event_type,
  event_category,
  step_number,
  document_type,
  status,
  created_at
FROM onboarding_event_log
WHERE user_id = 'user-uuid-here'
ORDER BY created_at ASC;
```

### 2. Encontrar usuarios con errores

```sql
SELECT 
  user_id,
  COUNT(*) as error_count,
  array_agg(DISTINCT error_message) as unique_errors
FROM onboarding_event_log
WHERE event_category = 'error'
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY error_count DESC;
```

### 3. Tasa de éxito de procesamiento AI

```sql
SELECT 
  document_type,
  COUNT(*) FILTER (WHERE status = 'processed') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'processed')::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as success_rate
FROM onboarding_event_log
WHERE event_type IN ('document_processed', 'document_processing_failed')
GROUP BY document_type;
```

### 4. Tiempo promedio del onboarding

```sql
WITH user_sessions AS (
  SELECT 
    user_id,
    MIN(created_at) FILTER (WHERE event_type = 'onboarding_started') as start_time,
    MAX(created_at) FILTER (WHERE event_type = 'onboarding_completed') as end_time
  FROM onboarding_event_log
  GROUP BY user_id
)
SELECT 
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) / 60 as avg_minutes,
  COUNT(*) as completed_users
FROM user_sessions
WHERE end_time IS NOT NULL;
```

### 5. Documentos más problemáticos

```sql
SELECT 
  document_type,
  COUNT(*) as error_count,
  array_agg(DISTINCT error_code) as error_codes
FROM onboarding_event_log
WHERE event_category = 'error'
AND document_type IS NOT NULL
GROUP BY document_type
ORDER BY error_count DESC;
```

---

## Dashboard de Analytics

### Métricas Clave para Monitorear

1. **Tasa de Conversión por Paso**
   ```sql
   SELECT 
     step_number,
     COUNT(DISTINCT user_id) as users_reached,
     COUNT(*) FILTER (WHERE event_type = 'step_completed') as users_completed
   FROM onboarding_event_log
   WHERE step_number IS NOT NULL
   GROUP BY step_number
   ORDER BY step_number;
   ```

2. **Abandono por Paso**
   ```sql
   -- Usuarios que llegaron a un paso pero no lo completaron
   SELECT 
     step_number,
     COUNT(DISTINCT user_id) as abandoned
   FROM onboarding_event_log
   WHERE step_number IS NOT NULL
   AND user_id NOT IN (
     SELECT DISTINCT user_id 
     FROM onboarding_event_log 
     WHERE event_type = 'step_completed' 
     AND step_number = onboarding_event_log.step_number
   )
   GROUP BY step_number;
   ```

3. **Distribución temporal de uploads**
   ```sql
   SELECT 
     date_trunc('hour', created_at) as hour,
     COUNT(*) as uploads
   FROM onboarding_event_log
   WHERE event_type = 'document_uploaded'
   AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY hour
   ORDER BY hour;
   ```

---

## Ejemplo de Timeline Completo

```
Usuario: 4a2b0127-c5d0-4ffc-b7ff-25ad6e665a72
Batch: aa11bb22-cc33-dd44-ee55-ff6677889900

[2024-12-21 09:00:00] onboarding_started (step 1)
[2024-12-21 09:01:30] step_completed (step 1)
[2024-12-21 09:02:00] batch_created
[2024-12-21 09:02:15] storage_upload_success (Closing Statement)
[2024-12-21 09:02:16] document_uploaded (Closing Statement)
[2024-12-21 09:02:17] document_processing_started (Closing Statement)
[2024-12-21 09:02:45] document_processed (Closing Statement)
[2024-12-21 09:03:00] storage_upload_success (Mortgage Statement)
[2024-12-21 09:03:01] document_uploaded (Mortgage Statement)
...
[2024-12-21 09:10:00] onboarding_completed
```

---

## Mejores Prácticas

### 1. No Bloquear el Flujo
Los logs son async y no deben bloquear la respuesta al usuario:

```javascript
// ✅ Correcto - Fire and forget
eventLogger.logDocumentUploaded(...); // No await

// ❌ Incorrecto - Bloquea respuesta
await eventLogger.logDocumentUploaded(...);
```

### 2. Metadata Rica
Incluye contexto útil en metadata:

```javascript
await eventLogger.logError(userId, 'payment_failed', error.message, {
  amount: 49.99,
  payment_method: 'credit_card',
  gateway_response: gatewayData,
  user_plan: 'premium'
});
```

### 3. Limpiar Logs Antiguos
Programa una tarea para archivar logs viejos:

```sql
-- Archivar logs > 90 días
CREATE TABLE onboarding_event_log_archive 
  (LIKE onboarding_event_log INCLUDING ALL);

INSERT INTO onboarding_event_log_archive
SELECT * FROM onboarding_event_log
WHERE created_at < NOW() - INTERVAL '90 days';

DELETE FROM onboarding_event_log
WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## Soporte

Para preguntas o reportar bugs: eprada@teamlinx.com
