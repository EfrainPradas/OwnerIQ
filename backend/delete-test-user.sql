-- =========================================
-- SCRIPT PARA ELIMINAR USUARIO COMPLETAMENTE
-- =========================================
-- ⚠️⚠️⚠️ SUPER PELIGROSO ⚠️⚠️⚠️
-- Esto BORRA PERMANENTEMENTE:
-- - Usuario de auth.users
-- - Profile de profiles  
-- - Event logs
-- - Document uploads
-- - Import batches
-- - TODOS los datos relacionados
-- =========================================

-- =========================================
-- MÉTODO 1: Eliminar por Email
-- =========================================

DO $$
DECLARE
    target_email TEXT := 'test@example.com'; -- ⬅️ CAMBIA ESTO
    target_user_id UUID;
    deleted_events INTEGER;
    deleted_uploads INTEGER;
    deleted_batches INTEGER;
BEGIN
    -- 1. Obtener user_id del email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con email % no encontrado', target_email;
    END IF;
    
    RAISE NOTICE '⚠️ ELIMINANDO USUARIO: % (ID: %)', target_email, target_user_id;
    
    -- 2. Borrar event logs
    DELETE FROM onboarding_event_log 
    WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_events = ROW_COUNT;
    RAISE NOTICE '✅ Event logs eliminados: %', deleted_events;
    
    -- 3. Borrar document uploads
    DELETE FROM document_uploads 
    WHERE batch_id IN (
        SELECT batch_id FROM import_batches WHERE user_id = target_user_id
    );
    GET DIAGNOSTICS deleted_uploads = ROW_COUNT;
    RAISE NOTICE '✅ Document uploads eliminados: %', deleted_uploads;
    
    -- 4. Borrar batches
    DELETE FROM import_batches 
    WHERE user_id = target_user_id;
    GET DIAGNOSTICS deleted_batches = ROW_COUNT;
    RAISE NOTICE '✅ Import batches eliminados: %', deleted_batches;
    
    -- 5. Borrar profile
    DELETE FROM profiles 
    WHERE user_id = target_user_id;
    RAISE NOTICE '✅ Profile eliminado';
    
    -- 6. Borrar usuario de auth
    -- NOTA: Esto requiere permisos de admin
    -- Si falla, usar: DELETE FROM auth.users WHERE id = target_user_id;
    DELETE FROM auth.users 
    WHERE id = target_user_id;
    RAISE NOTICE '✅ Usuario eliminado de auth.users';
    
    RAISE NOTICE '🎉 Usuario % completamente eliminado', target_email;
    RAISE NOTICE '⚠️ Recuerda borrar archivos en Storage manualmente';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error eliminando usuario: %', SQLERRM;
END $$;

-- =========================================
-- MÉTODO 2: Eliminar por User ID
-- =========================================

DO $$
DECLARE
    target_user_id UUID := 'YOUR-USER-ID-HERE'; -- ⬅️ CAMBIA ESTO
BEGIN
    RAISE NOTICE '⚠️ ELIMINANDO USUARIO ID: %', target_user_id;
    
    -- Borrar en cascada
    DELETE FROM onboarding_event_log WHERE user_id = target_user_id;
    DELETE FROM document_uploads WHERE batch_id IN (
        SELECT batch_id FROM import_batches WHERE user_id = target_user_id
    );
    DELETE FROM import_batches WHERE user_id = target_user_id;
    DELETE FROM profiles WHERE user_id = target_user_id;
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RAISE NOTICE '✅ Usuario eliminado completamente';
END $$;

-- =========================================
-- MÉTODO 3: Función Helper Reutilizable
-- =========================================

CREATE OR REPLACE FUNCTION delete_user_completely(target_email TEXT)
RETURNS TABLE (
    action TEXT,
    count INTEGER,
    details TEXT
) AS $$
DECLARE
    target_user_id UUID;
    event_count INTEGER;
    upload_count INTEGER;
    batch_count INTEGER;
BEGIN
    -- Get user_id
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario con email % no encontrado', target_email;
    END IF;
    
    -- Delete event logs
    DELETE FROM onboarding_event_log WHERE user_id = target_user_id;
    GET DIAGNOSTICS event_count = ROW_COUNT;
    
    -- Delete uploads
    DELETE FROM document_uploads WHERE batch_id IN (
        SELECT batch_id FROM import_batches WHERE user_id = target_user_id
    );
    GET DIAGNOSTICS upload_count = ROW_COUNT;
    
    -- Delete batches
    DELETE FROM import_batches WHERE user_id = target_user_id;
    GET DIAGNOSTICS batch_count = ROW_COUNT;
    
    -- Delete profile
    DELETE FROM profiles WHERE user_id = target_user_id;
    
    -- Delete from auth
    DELETE FROM auth.users WHERE id = target_user_id;
    
    -- Return results
    RETURN QUERY VALUES 
        ('Event logs deleted', event_count, target_user_id::TEXT),
        ('Document uploads deleted', upload_count, NULL),
        ('Import batches deleted', batch_count, NULL),
        ('Profile deleted', 1, target_email),
        ('User deleted from auth', 1, target_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usar la función:
-- SELECT * FROM delete_user_completely('test@example.com');

-- =========================================
-- VERIFICACIÓN: Ver usuarios registrados
-- =========================================

SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    p.owner_name,
    p.onboarding_status,
    (SELECT COUNT(*) FROM onboarding_event_log WHERE user_id = u.id) as event_logs,
    (SELECT COUNT(*) FROM import_batches WHERE user_id = u.id) as batches
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
ORDER BY u.created_at DESC;

-- =========================================
-- ELIMINAR MÚLTIPLES USUARIOS DE PRUEBA
-- =========================================
-- Si tienes muchos usuarios de prueba con un patrón específico

DO $$
DECLARE
    test_user RECORD;
BEGIN
    -- Buscar usuarios con email que contenga 'test'
    FOR test_user IN 
        SELECT id, email 
        FROM auth.users 
        WHERE email LIKE '%test%'
        OR email LIKE '%demo%'
    LOOP
        RAISE NOTICE 'Eliminando: %', test_user.email;
        
        DELETE FROM onboarding_event_log WHERE user_id = test_user.id;
        DELETE FROM document_uploads WHERE batch_id IN (
            SELECT batch_id FROM import_batches WHERE user_id = test_user.id
        );
        DELETE FROM import_batches WHERE user_id = test_user.id;
        DELETE FROM profiles WHERE user_id = test_user.id;
        DELETE FROM auth.users WHERE id = test_user.id;
        
        RAISE NOTICE '✅ % eliminado', test_user.email;
    END LOOP;
    
    RAISE NOTICE '🎉 Todos los usuarios de prueba eliminados';
END $$;

-- =========================================
-- SAFETY CHECK: Preview antes de borrar
-- =========================================
-- Ejecuta esto ANTES de eliminar para ver qué se borrará

WITH target_user AS (
    SELECT id, email FROM auth.users WHERE email = 'test@example.com'
)
SELECT 
    'Usuario' as type,
    u.email as identifier,
    1 as count
FROM auth.users u, target_user t
WHERE u.id = t.id

UNION ALL

SELECT 
    'Profile',
    p.owner_name,
    1
FROM profiles p, target_user t
WHERE p.user_id = t.id

UNION ALL

SELECT 
    'Event Logs',
    NULL,
    COUNT(*)::INTEGER
FROM onboarding_event_log e, target_user t
WHERE e.user_id = t.id

UNION ALL

SELECT 
    'Import Batches',
    NULL,
    COUNT(*)::INTEGER
FROM import_batches b, target_user t
WHERE b.user_id = t.id

UNION ALL

SELECT 
    'Document Uploads',
    NULL,
    COUNT(*)::INTEGER
FROM document_uploads d
WHERE d.batch_id IN (
    SELECT batch_id FROM import_batches b, target_user t
    WHERE b.user_id = t.id
);

-- =========================================
-- NOTAS IMPORTANTES
-- =========================================
/*
⚠️ ADVERTENCIAS CRÍTICAS:

1. IRREVERSIBLE: No hay UNDO. Una vez borrado, se perdió para siempre.

2. STORAGE: Los archivos en Storage NO se borran automáticamente:
   - Ve a Supabase Dashboard > Storage > property-documents
   - Busca carpetas con el user_id
   - Bórralas manualmente

3. PERMISOS: Puede que necesites permisos especiales para borrar de auth.users.
   Si falla, usa: supabase.auth.admin.deleteUser(userId) desde Node.js

4. BACKUP: Si no estás 100% seguro, haz backup PRIMERO:
   
   CREATE TABLE auth_users_backup AS SELECT * FROM auth.users WHERE email = 'test@example.com';
   CREATE TABLE profiles_backup AS SELECT * FROM profiles WHERE user_id = '...';

5. PRODUCCIÓN: NUNCA uses esto en producción con usuarios reales.
   Solo para testing/development.

6. CASCADE: Algunas tablas pueden tener CASCADE DELETE configurado.
   Verifica con: 
   SELECT * FROM information_schema.table_constraints 
   WHERE constraint_type = 'FOREIGN KEY';
*/
