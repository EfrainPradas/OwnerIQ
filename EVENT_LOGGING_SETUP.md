# 📊 Event Logging System - Quick Start Guide

Sistema completo de auditoría y tracking del flujo de onboarding de OwnerIQ.

## ✅ Instalación Completada

Ya se han ejecutado los siguientes pasos:

1. ✅ Tabla `onboarding_event_log` creada en Supabase
2. ✅ Índices y políticas RLS configuradas
3. ✅ Clase `OnboardingEventLogger` implementada
4. ✅ Logging integrado en el backend
5. ✅ Vista frontend `EventLogView` creada
6. ✅ Navegación agregada al dashboard

## 🚀 Cómo Usar

### Ver los Logs en el Frontend

1. Inicia sesión en la aplicación
2. Click en **📝 Event Logs** en el navigation bar
3. ¡Listo! Verás todos tus eventos en tiempo real

### Características de la Vista

- **Auto-refresh**: Se actualiza automáticamente cada 10 segundos
- **Filtros por**:
  - Rango de tiempo (1h, 24h, 7d, todo)
  - Categoría (navigation, upload, processing, errors)
  - Tipo de evento específico
- **Stats Cards**: Métricas en tiempo real
- **Timeline Visual**: Todos los eventos con iconos y colores
- **Metadata Expandible**: Click en "View Metadata" para ver detalles

### Consultar Logs desde CLI

```bash
cd backend

# Ver timeline de un usuario
node query-event-logs.js user <user_id>

# Ver estadísticas de un batch
node query-event-logs.js batch <batch_id>

# Ver errores recientes
node query-event-logs.js errors

# Ver stats por tipo de documento
node query-event-logs.js stats
```

## 📝 Eventos que se Registran

### Durante Upload:
1. `batch_created` - Cuando se crea un nuevo batch
2. `storage_upload_success` - Archivo subido a Supabase Storage
3. `document_uploaded` - Registro en database creado
4. `document_processing_started` - AI inicia extracción
5. `document_processed` - AI termina exitosamente
6. `document_processing_failed` - Error en procesamiento

### Errores:
- `batch_creation_failed` - No se pudo crear batch
- `upload_error` - Fallo en upload a Storage
- `document_upload_db_failed` - Error al guardar en DB

## 🔍 Consultas SQL Útiles

### Ver eventos recientes
```sql
SELECT * FROM onboarding_event_log
WHERE user_id = 'tu-user-id'
ORDER BY created_at DESC
LIMIT 50;
```

### Documentos con errores
```sql
SELECT 
  document_type,
  error_message,
  COUNT(*) as error_count
FROM onboarding_event_log
WHERE event_category = 'error'
GROUP BY document_type, error_message
ORDER BY error_count DESC;
```

### Tiempo promedio de procesamiento
```sql
WITH processing_times AS (
  SELECT 
    upload_id,
    MIN(created_at) FILTER (WHERE event_type = 'document_processing_started') as start_time,
    MAX(created_at) FILTER (WHERE event_type = 'document_processed') as end_time
  FROM onboarding_event_log
  WHERE upload_id IS NOT NULL
  GROUP BY upload_id
)
SELECT 
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_seconds
FROM processing_times
WHERE end_time IS NOT NULL;
```

## 📚 Documentación Completa

Para documentación detallada, ver: `backend/EVENT_LOGGING_DOCUMENTATION.md`

## 🎯 Próximos Pasos Sugeridos

1. **Alertas**: Configurar notificaciones cuando haya >5 errores en 1 hora
2. **Dashboard Analytics**: Crear vista de métricas agregadas
3. **Export**: Permitir exportar logs a CSV/JSON
4. **Retention Policy**: Archivar logs antiguos (>90 días)

## 🐛 Troubleshooting

### Los logs no aparecen
- Verifica que la tabla `onboarding_event_log` existe
- Confirma que las políticas RLS están activas
- Revisa la consola del navegador para errores

### Error: "permission denied for table onboarding_event_log"
- Verifica las políticas RLS en Supabase
- Asegúrate que el usuario esté autenticado

### Auto-refresh no funciona
- Click en el botón "▶️ Resume Auto-Refresh"
- Verifiesa tu conexión a internet

---

**¿Preguntas?** Contacta: eprada@teamlinx.com
