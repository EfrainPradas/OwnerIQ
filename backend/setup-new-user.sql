-- ================================================================
-- SIMPLE CLEAN SETUP FOR NEW USER
-- User ID: 083f06ba-2578-425c-be7b-a67b30ac5bad
-- ================================================================

-- Clean properties
DELETE FROM property WHERE person_id = '083f06ba-2578-425c-be7b-a67b30ac5bad';

-- Clean property onboarding records (which also cleans document uploads via CASCADE)
DELETE FROM property_onboarding WHERE user_id = '083f06ba-2578-425c-be7b-a67b30ac5bad';

-- Verify empty state
SELECT 'VERIFICATION RESULTS:' as status;

SELECT 'Properties:' as table_name, COUNT(*) as count 
FROM property 
WHERE person_id = '083f06ba-2578-425c-be7b-a67b30ac5bad'
UNION ALL
SELECT 'Property Onboarding:', COUNT(*) 
FROM property_onboarding 
WHERE user_id = '083f06ba-2578-425c-be7b-a67b30ac5bad';

SELECT '✅ User is clean and ready!' as status;
