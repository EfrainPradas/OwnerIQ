-- =========================================
-- SCRIPT DE LIMPIEZA DE DATOS DE PRUEBA
-- =========================================
-- ADVERTENCIA: Este script BORRA datos permanentemente.
-- Úsalo solo en desarrollo/testing, NUNCA en producción.
-- =========================================

-- =========================================
-- OPCIÓN 1: Limpiar TODO (Reset completo)
-- =========================================
-- ⚠️ PELIGROSO: Borra TODOS los datos de prueba
-- Descomenta las siguientes líneas si estás seguro:

/*
TRUNCATE TABLE onboarding_event_log CASCADE;
TRUNCATE TABLE document_uploads CASCADE;
TRUNCATE TABLE import_batches CASCADE;
-- NOTA: No borra usuarios ni profiles, solo datos de onboarding
*/

-- =========================================
-- OPCIÓN 2: Limpiar por Usuario Específico
-- =========================================
-- Reemplaza 'YOUR-USER-ID-HERE' con el ID del usuario de prueba

DO $$
DECLARE
    test_user_id UUID := 'YOUR-USER-ID-HERE'; -- ⬅️ CAMBIA ESTO
BEGIN
    -- 1. Borrar event logs
    DELETE FROM onboarding_event_log 
    WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Event logs deleted for user %', test_user_id;
    
    -- 2. Borrar document uploads
    DELETE FROM document_uploads 
    WHERE batch_id IN (
        SELECT batch_id FROM import_batches WHERE user_id = test_user_id
    );
    
    RAISE NOTICE 'Document uploads deleted for user %', test_user_id;
    
    -- 3. Borrar batches
    DELETE FROM import_batches 
    WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Import batches deleted for user %', test_user_id;
    
    -- 4. Opcional: Reset profile a estado inicial
    UPDATE profiles 
    SET 
        onboarding_status = 'NOT_STARTED',
        current_onboarding_step = 1,
        onboarding_completed_at = NULL
    WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Profile reset for user %', test_user_id;
    
END $$;

-- =========================================
-- OPCIÓN 3: Limpiar por Email
-- =========================================
-- Si conoces el email pero no el UUID

DO $$
DECLARE
    test_email TEXT := 'test@example.com'; -- ⬅️ CAMBIA ESTO
    test_user_id UUID;
BEGIN
    -- Obtener user_id del email
    SELECT id INTO test_user_id
    FROM auth.users
    WHERE email = test_email;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', test_email;
    END IF;
    
    RAISE NOTICE 'Found user_id: % for email: %', test_user_id, test_email;
    
    -- Borrar datos
    DELETE FROM onboarding_event_log WHERE user_id = test_user_id;
    DELETE FROM document_uploads WHERE batch_id IN (
        SELECT batch_id FROM import_batches WHERE user_id = test_user_id
    );
    DELETE FROM import_batches WHERE user_id = test_user_id;
    
    UPDATE profiles 
    SET 
        onboarding_status = 'NOT_STARTED',
        current_onboarding_step = 1
    WHERE user_id = test_user_id;
    
    RAISE NOTICE 'All test data cleaned for %', test_email;
END $$;

-- =========================================
-- OPCIÓN 4: Limpiar Datos Antiguos (>7 días)
-- =========================================
-- Mantiene datos recientes, borra solo lo viejo

DO $$
DECLARE
    cutoff_date TIMESTAMP := NOW() - INTERVAL '7 days';
    deleted_events INTEGER;
    deleted_uploads INTEGER;
    deleted_batches INTEGER;
BEGIN
    -- Borrar event logs antiguos
    DELETE FROM onboarding_event_log 
    WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_events = ROW_COUNT;
    
    -- Borrar uploads antiguos
    DELETE FROM document_uploads 
    WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_uploads = ROW_COUNT;
    
    -- Borrar batches antiguos
    DELETE FROM import_batches 
    WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_batches = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % event logs older than %', deleted_events, cutoff_date;
    RAISE NOTICE 'Deleted % document uploads older than %', deleted_uploads, cutoff_date;
    RAISE NOTICE 'Deleted % import batches older than %', deleted_batches, cutoff_date;
END $$;

-- =========================================
-- OPCIÓN 5: Limpiar Solo Event Logs
-- =========================================
-- Cuando solo quieres limpiar los logs pero mantener los documentos

DELETE FROM onboarding_event_log 
WHERE user_id = 'YOUR-USER-ID-HERE'; -- ⬅️ CAMBIA ESTO

-- =========================================
-- OPCIÓN 6: Limpiar Errores Específicos
-- =========================================
-- Borrar solo eventos de error para empezar limpio

DELETE FROM onboarding_event_log 
WHERE event_category = 'error'
AND user_id = 'YOUR-USER-ID-HERE'; -- ⬅️ CAMBIA ESTO

-- =========================================
-- OPCIÓN 7: Limpiar Documentos Failed
-- =========================================
-- Borrar solo documentos que fallaron en procesamiento

DELETE FROM document_uploads 
WHERE upload_status = 'FAILED'
AND batch_id IN (
    SELECT batch_id FROM import_batches WHERE user_id = 'YOUR-USER-ID-HERE'
);

-- =========================================
-- VERIFICACIÓN: Contar registros actuales
-- =========================================
-- Ejecuta esto ANTES y DESPUÉS de limpiar para confirmar

SELECT 
    'event_logs' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users
FROM onboarding_event_log

UNION ALL

SELECT 
    'document_uploads',
    COUNT(*),
    COUNT(DISTINCT batch_id)
FROM document_uploads

UNION ALL

SELECT 
    'import_batches',
    COUNT(*),
    COUNT(DISTINCT user_id)
FROM import_batches;

-- =========================================
-- BACKUP: Crear backup antes de borrar
-- =========================================
-- Crea copias de seguridad por si acaso

CREATE TABLE IF NOT EXISTS onboarding_event_log_backup AS 
SELECT * FROM onboarding_event_log WHERE 1=0;

CREATE TABLE IF NOT EXISTS document_uploads_backup AS 
SELECT * FROM document_uploads WHERE 1=0;

CREATE TABLE IF NOT EXISTS import_batches_backup AS 
SELECT * FROM import_batches WHERE 1=0;

-- Copiar datos específicos al backup
INSERT INTO onboarding_event_log_backup
SELECT * FROM onboarding_event_log
WHERE user_id = 'YOUR-USER-ID-HERE'; -- ⬅️ CAMBIA ESTO

INSERT INTO document_uploads_backup
SELECT * FROM document_uploads
WHERE batch_id IN (
    SELECT batch_id FROM import_batches WHERE user_id = 'YOUR-USER-ID-HERE'
);

INSERT INTO import_batches_backup
SELECT * FROM import_batches
WHERE user_id = 'YOUR-USER-ID-HERE'; -- ⬅️ CAMBIA ESTO

-- =========================================
-- RESTAURAR: Si cometiste un error
-- =========================================
-- Restaura desde el backup

/*
INSERT INTO onboarding_event_log
SELECT * FROM onboarding_event_log_backup;

INSERT INTO document_uploads
SELECT * FROM document_uploads_backup;

INSERT INTO import_batches
SELECT * FROM import_batches_backup;
*/

-- =========================================
-- FUNCIÓN HELPER: Limpiar por Email (Reutilizable)
-- =========================================
-- Crea una función que puedes llamar fácilmente

CREATE OR REPLACE FUNCTION clean_test_data(test_email TEXT)
RETURNS TABLE (
    action TEXT,
    records_deleted INTEGER
) AS $$
DECLARE
    test_user_id UUID;
    event_count INTEGER;
    upload_count INTEGER;
    batch_count INTEGER;
BEGIN
    -- Get user_id
    SELECT id INTO test_user_id
    FROM auth.users
    WHERE email = test_email;
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', test_email;
    END IF;
    
    -- Delete event logs
    DELETE FROM onboarding_event_log WHERE user_id = test_user_id;
    GET DIAGNOSTICS event_count = ROW_COUNT;
    
    -- Delete uploads
    DELETE FROM document_uploads WHERE batch_id IN (
        SELECT batch_id FROM import_batches WHERE user_id = test_user_id
    );
    GET DIAGNOSTICS upload_count = ROW_COUNT;
    
    -- Delete batches
    DELETE FROM import_batches WHERE user_id = test_user_id;
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    
    -- Reset profile
    UPDATE profiles 
    SET onboarding_status = 'NOT_STARTED', current_onboarding_step = 1
    WHERE user_id = test_user_id;
    
    -- Return results
    RETURN QUERY VALUES 
        ('Event logs deleted', event_count),
        ('Document uploads deleted', upload_count),
        ('Import batches deleted', batch_count);
END;
$$ LANGUAGE plpgsql;

-- Usar la función:
-- SELECT * FROM clean_test_data('test@example.com');

-- =========================================
-- NOTAS IMPORTANTES
-- =========================================
/*
1. Siempre verifica el user_id/email antes de ejecutar
2. Usa la opción de BACKUP en producción
3. Los event logs usan CASCADE, se borran automáticamente con sus relaciones
4. Storage files NO se borran con este script (hazlo manualmente en Supabase Storage)
5. Para borrar COMPLETAMENTE un usuario test, también elimina:
   - Archivos en Storage bucket 'property-documents/{user_id}/'
   - El usuario en Authentication (si no lo necesitas más)

PARA BORRAR ARCHIVOS EN STORAGE:
- Ve a Supabase Dashboard > Storage > property-documents
- Navega a la carpeta del user_id
- Borra la carpeta completa
*/
