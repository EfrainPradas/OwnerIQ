-- ================================================================
-- COMPLETE RESET & WORKFLOW VERIFICATION SCRIPT
-- ================================================================
-- This script will:
-- 1. Clean ALL data for user e8484c78-ab04-4ef8-82bb-fe41b7bc893a
-- 2. Set up proper onboarding configuration
-- 3. Prepare for fresh document processing
-- ================================================================

-- USER ID to clean
DO $$
DECLARE
    target_user_id UUID := 'e8484c78-ab04-4ef8-82bb-fe41b7bc893a';
BEGIN
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CLEANING ALL DATA FOR USER: %', target_user_id;
    RAISE NOTICE '==========================================';

    -- ============================================
    -- STEP 1: DELETE PROPERTIES & RELATED DATA
    -- ============================================
    RAISE NOTICE 'Step 1: Deleting properties...';
    DELETE FROM property WHERE person_id = target_user_id;
    RAISE NOTICE '✓ Properties deleted';

    -- ============================================
    -- STEP 2: DELETE DOCUMENT UPLOADS
    -- ============================================
    RAISE NOTICE 'Step 2: Deleting document uploads...';
    DELETE FROM document_uploads WHERE user_id = target_user_id;
    RAISE NOTICE '✓ Document uploads deleted';

    -- ============================================
    -- STEP 3: DELETE IMPORT BATCHES
    -- ============================================
    RAISE NOTICE 'Step 3: Deleting import batches...';
    DELETE FROM import_batches WHERE user_id = target_user_id;
    RAISE NOTICE '✓ Import batches deleted';

    -- ============================================
    -- STEP 4: CLEAN ONBOARDING DATA (keep structure)
    -- ============================================
    RAISE NOTICE 'Step 4: Cleaning onboarding data...';
    DELETE FROM property_onboarding WHERE user_id = target_user_id;
    RAISE NOTICE '✓ Onboarding data cleaned';

    -- ============================================
    -- STEP 5: SETUP ONBOARDING CONFIGURATION
    -- ============================================
    RAISE NOTICE 'Step 5: Setting up onboarding configuration...';
    INSERT INTO property_onboarding (
        user_id,
        has_primary_residence,
        investment_property_count,
        created_at,
        updated_at
    ) VALUES (
        target_user_id,
        true,  -- YES - User wants to register PRIMARY RESIDENCE
        2,     -- User has 2 INVESTMENT properties
        NOW(),
        NOW()
    );
    RAISE NOTICE '✓ Onboarding configured: has_primary_residence=TRUE, investment_count=2';

    RAISE NOTICE '==========================================';
    RAISE NOTICE 'CLEANUP COMPLETE!';
    RAISE NOTICE '==========================================';
END $$;

-- ============================================
-- VERIFICATION: Show current state
-- ============================================
SELECT '=== ONBOARDING CONFIGURATION ===' as info;
SELECT * FROM property_onboarding WHERE user_id = 'e8484c78-ab04-4ef8-82bb-fe41b7bc893a';

SELECT '=== PROPERTIES COUNT ===' as info;
SELECT COUNT(*) as property_count FROM property WHERE person_id = 'e8484c78-ab04-4ef8-82bb-fe41b7bc893a';

SELECT '=== DOCUMENT UPLOADS COUNT ===' as info;
SELECT COUNT(*) as document_count FROM document_uploads WHERE user_id = 'e8484c78-ab04-4ef8-82bb-fe41b7bc893a';

SELECT '=== IMPORT BATCHES COUNT ===' as info;
SELECT COUNT(*) as batch_count FROM import_batches WHERE user_id = 'e8484c78-ab04-4ef8-82bb-fe41b7bc893a';

-- ============================================
-- EXPECTED STATE AFTER THIS SCRIPT:
-- ============================================
-- ✓ property_onboarding: 1 row (has_primary_residence=true, investment_property_count=2)
-- ✓ property: 0 rows
-- ✓ document_uploads: 0 rows  
-- ✓ import_batches: 0 rows
-- ============================================
