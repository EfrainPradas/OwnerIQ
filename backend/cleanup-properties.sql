-- ⚠️ DELETE ALL PROPERTIES
-- This will delete all properties for a specific user

-- OPTION 1: Delete for a SPECIFIC user only (RECOMMENDED)
-- Replace with your actual person_id if different

DO $$
DECLARE
    target_person_id UUID := 'e8484c78-ab04-4ef8-82bb-fe41b7bc893a'; -- Your user ID
    deleted_count INTEGER;
BEGIN
    -- Delete properties
    DELETE FROM property WHERE person_id = target_person_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Deleted % properties for person %', deleted_count, target_person_id;
END $$;


-- OPTION 2: Delete ALL properties from the entire database (DANGEROUS! Use with caution)
-- Uncomment the line below ONLY if you want to delete EVERYTHING

/*
TRUNCATE TABLE property CASCADE;
*/

-- Verify deletion
SELECT 
    'Properties remaining:' as info,
    COUNT(*) as count 
FROM property;

SELECT 
    'Properties for your user:' as info,
    COUNT(*) as count 
FROM property 
WHERE person_id = 'e8484c78-ab04-4ef8-82bb-fe41b7bc893a';
