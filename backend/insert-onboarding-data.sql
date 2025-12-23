-- Insert onboarding data for user
-- This tells the system you want to register your primary residence

INSERT INTO property_onboarding (
    user_id,
    has_primary_residence,
    investment_property_count,
    created_at,
    updated_at
) VALUES (
    'e8484c78-ab04-4ef8-82bb-fe41b7bc893a',  -- Your user ID
    true,  -- YES, you want to register primary residence
    2,     -- You have 2 investment properties
    NOW(),
    NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    has_primary_residence = EXCLUDED.has_primary_residence,
    investment_property_count = EXCLUDED.investment_property_count,
    updated_at = NOW();

-- Verify the insert
SELECT * FROM property_onboarding WHERE user_id = 'e8484c78-ab04-4ef8-82bb-fe41b7bc893a';
