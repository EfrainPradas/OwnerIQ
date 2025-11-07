-- =====================================================================
-- RENT COLLECTION SYSTEM - TEST DATA (DATOS REALES)
-- =====================================================================
-- Author: Kilo Code
-- Date: 2025-10-09
-- Description: Datos de prueba usando personas y propiedades reales
-- =====================================================================

SET search_path = public;

-- =====================================================================
-- NOTA: Este script usa los datos reales existentes:
-- PROPIETARIOS:
-- - Efrain Jose Prada (db731feb-cbf5-40ae-916e-4ce20f23d70e)
-- - Ernesto Finol (79860a53-3504-4868-bc17-57eea574b331)
--
-- INQUILINOS:
-- - Pedrito Perez (6add3938-defd-42f1-8b86-63d4b47e00d6) - REAL
-- - + 5 inquilinos ficticios con diferentes perfiles de pago
--
-- PROPIEDADES:
-- - 2 propiedades reales en UT y TX
-- - 4 propiedades ficticias adicionales
-- =====================================================================

-- =====================================================================
-- 1. VERIFICAR DATOS EXISTENTES
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '🔍 Verificando datos existentes...';
  
  -- Verificar propietarios
  IF EXISTS (SELECT 1 FROM person WHERE person_id = 'db731feb-cbf5-40ae-916e-4ce20f23d70e') THEN
    RAISE NOTICE '   ✓ Efrain Jose Prada (propietario) encontrado';
  ELSE
    RAISE EXCEPTION '   ✗ Efrain Jose Prada NO encontrado';
  END IF;
  
  IF EXISTS (SELECT 1 FROM person WHERE person_id = '79860a53-3504-4868-bc17-57eea574b331') THEN
    RAISE NOTICE '   ✓ Ernesto Finol (propietario) encontrado';
  ELSE
    RAISE EXCEPTION '   ✗ Ernesto Finol NO encontrado';
  END IF;
  
  -- Verificar inquilino real
  IF EXISTS (SELECT 1 FROM person WHERE person_id = '6add3938-defd-42f1-8b86-63d4b47e00d6') THEN
    RAISE NOTICE '   ✓ Pedrito Perez (inquilino) encontrado';
  ELSE
    RAISE EXCEPTION '   ✗ Pedrito Perez NO encontrado';
  END IF;
  
  -- Verificar propiedades
  IF EXISTS (SELECT 1 FROM property WHERE property_id = '21733268-7f01-4e03-9303-f9c592c19419') THEN
    RAISE NOTICE '   ✓ Propiedad Eagle Mountain (Efrain) encontrada';
  ELSE
    RAISE EXCEPTION '   ✗ Propiedad Eagle Mountain NO encontrada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM property WHERE property_id = '611e5c46-57e4-4a24-985d-db124bf84b0e') THEN
    RAISE NOTICE '   ✓ Propiedad Richmond TX (Efrain) encontrada';
  ELSE
    RAISE EXCEPTION '   ✗ Propiedad Richmond TX NO encontrada';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- 2. CREAR PROPIEDADES FICTICIAS ADICIONALES
-- =====================================================================

-- Propiedad 3: Casa en Orlando, FL (Efrain)
INSERT INTO property (
  property_id,
  person_id,
  address,
  valuation,
  rent,
  taxes,
  insurance,
  hoa,
  maintenance,
  vacancy,
  loan_rate,
  loan_term,
  ltv,
  state,
  city,
  zip_code,
  property_type,
  notes
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'db731feb-cbf5-40ae-916e-4ce20f23d70e',  -- Efrain propietario
  '1234 Sunset Blvd, Orlando, FL 32801',
  425000.00,
  2500.00,
  4200.00,
  1800.00,
  85.00,
  10.00,
  100.00,
  5.75,
  30,
  80.00,
  'FL',
  'Orlando',
  '32801',
  'residential',
  'Casa de inversión en Orlando - Propiedad de Efrain'
) ON CONFLICT (property_id) DO NOTHING;

-- Propiedad 4: Townhouse en Austin, TX (Efrain)
INSERT INTO property (
  property_id,
  person_id,
  address,
  valuation,
  rent,
  taxes,
  insurance,
  hoa,
  maintenance,
  vacancy,
  loan_rate,
  loan_term,
  ltv,
  state,
  city,
  zip_code,
  property_type,
  notes
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'db731feb-cbf5-40ae-916e-4ce20f23d70e',  -- Efrain propietario
  '5678 Tech Drive, Austin, TX 78701',
  550000.00,
  3200.00,
  6500.00,
  2100.00,
  150.00,
  10.00,
  100.00,
  6.25,
  30,
  75.00,
  'TX',
  'Austin',
  '78701',
  'residential',
  'Townhouse en Austin - Propiedad de Efrain'
) ON CONFLICT (property_id) DO NOTHING;

-- Propiedad 5: Condo en Miami, FL (Ernesto)
INSERT INTO property (
  property_id,
  person_id,
  address,
  valuation,
  rent,
  taxes,
  insurance,
  hoa,
  maintenance,
  vacancy,
  loan_rate,
  loan_term,
  ltv,
  state,
  city,
  zip_code,
  property_type,
  notes
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '79860a53-3504-4868-bc17-57eea574b331',  -- Ernesto propietario
  '9876 Ocean Drive, Miami, FL 33139',
  680000.00,
  3800.00,
  7200.00,
  2400.00,
  350.00,
  10.00,
  100.00,
  5.50,
  30,
  70.00,
  'FL',
  'Miami',
  '33139',
  'residential',
  'Condo frente al mar - Propiedad de Ernesto'
) ON CONFLICT (property_id) DO NOTHING;

-- Propiedad 6: Duplex en Houston, TX (Ernesto)
INSERT INTO property (
  property_id,
  person_id,
  address,
  valuation,
  rent,
  taxes,
  insurance,
  hoa,
  maintenance,
  vacancy,
  loan_rate,
  loan_term,
  ltv,
  state,
  city,
  zip_code,
  property_type,
  notes
) VALUES (
  'dddddddd-1111-1111-1111-111111111111',
  '79860a53-3504-4868-bc17-57eea574b331',  -- Ernesto propietario
  '4321 Memorial Drive, Houston, TX 77007',
  520000.00,
  2900.00,
  5800.00,
  1900.00,
  0.00,
  10.00,
  100.00,
  6.00,
  30,
  75.00,
  'TX',
  'Houston',
  '77007',
  'residential',
  'Duplex en Houston - Propiedad de Ernesto'
) ON CONFLICT (property_id) DO NOTHING;

-- =====================================================================
-- 3. CREAR INQUILINOS FICTICIOS CON DIFERENTES PERFILES
-- =====================================================================

-- INQUILINO 1: Sarah Johnson (EXCELENTE - Siempre paga a tiempo)
INSERT INTO person (
  person_id,
  legal_type,
  full_name,
  first_name,
  last_name,
  primary_email,
  primary_phone,
  status
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'individual',
  'Sarah Johnson',
  'Sarah',
  'Johnson',
  'sarah.johnson@example.com',
  '+1-407-555-0101',
  'active'
) ON CONFLICT (person_id) DO NOTHING;

-- INQUILINO 2: Michael Chen (BUENO - Paga a tiempo, ocasionalmente 1-2 días tarde)
INSERT INTO person (
  person_id,
  legal_type,
  full_name,
  first_name,
  last_name,
  primary_email,
  primary_phone,
  status
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'individual',
  'Michael Chen',
  'Michael',
  'Chen',
  'michael.chen@example.com',
  '+1-512-555-0102',
  'active'
) ON CONFLICT (person_id) DO NOTHING;

-- INQUILINO 3: Lisa Martinez (REGULAR - Paga tarde frecuentemente, pero paga)
INSERT INTO person (
  person_id,
  legal_type,
  full_name,
  first_name,
  last_name,
  primary_email,
  primary_phone,
  status
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'individual',
  'Lisa Martinez',
  'Lisa',
  'Martinez',
  'lisa.martinez@example.com',
  '+1-305-555-0103',
  'active'
) ON CONFLICT (person_id) DO NOTHING;

-- INQUILINO 4: David Thompson (MALO - Pagos parciales y muy tarde)
INSERT INTO person (
  person_id,
  legal_type,
  full_name,
  first_name,
  last_name,
  primary_email,
  primary_phone,
  status
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  'individual',
  'David Thompson',
  'David',
  'Thompson',
  'david.thompson@example.com',
  '+1-713-555-0104',
  'active'
) ON CONFLICT (person_id) DO NOTHING;

-- INQUILINO 5: Amanda Wilson (MUY MALO - Morosa, no paga)
INSERT INTO person (
  person_id,
  legal_type,
  full_name,
  first_name,
  last_name,
  primary_email,
  primary_phone,
  status
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  'individual',
  'Amanda Wilson',
  'Amanda',
  'Wilson',
  'amanda.wilson@example.com',
  '+1-281-555-0105',
  'active'
) ON CONFLICT (person_id) DO NOTHING;

-- =====================================================================
-- 4. CREAR PORTFOLIO
-- =====================================================================

INSERT INTO portfolio (portfolio_id, name, owner_user_id)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'Efrain & Ernesto Real Estate Portfolio',
  'db731feb-cbf5-40ae-916e-4ce20f23d70e'
) ON CONFLICT (portfolio_id) DO NOTHING;

-- =====================================================================
-- 5. CREAR LEASES (CONTRATOS)
-- =====================================================================

-- LEASE 1: Pedrito Perez en Eagle Mountain, UT (REAL - Propiedad de Efrain)
-- Perfil: BUENO - Paga a tiempo
INSERT INTO lease (
  lease_id,
  property_id,
  tenant_person_id,
  portfolio_id,
  lease_number,
  status,
  start_date,
  end_date,
  monthly_rent,
  security_deposit,
  rent_due_day,
  auto_generate_invoices,
  allow_partial_payments,
  notes
) VALUES (
  'lease001-1111-1111-1111-111111111111',
  '21733268-7f01-4e03-9303-f9c592c19419',  -- Eagle Mountain (Efrain)
  '6add3938-defd-42f1-8b86-63d4b47e00d6',  -- Pedrito Perez
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'LSE-2024-001',
  'active',
  '2024-06-01',
  '2025-05-31',
  3441.00,
  3441.00,
  1,
  TRUE,
  TRUE,
  'REAL: Casa de Efrain en Eagle Mountain alquilada a Pedrito. Llaves detrás del matero.'
) ON CONFLICT (lease_id) DO NOTHING;

-- LEASE 2: Sarah Johnson en Richmond, TX (Propiedad de Efrain)
-- Perfil: EXCELENTE - Siempre paga a tiempo, nunca tarde
INSERT INTO lease (
  lease_id,
  property_id,
  tenant_person_id,
  portfolio_id,
  lease_number,
  status,
  start_date,
  end_date,
  monthly_rent,
  security_deposit,
  rent_due_day,
  auto_generate_invoices,
  allow_partial_payments,
  notes
) VALUES (
  'lease002-2222-2222-2222-222222222222',
  '611e5c46-57e4-4a24-985d-db124bf84b0e',  -- Richmond TX (Efrain)
  '11111111-1111-1111-1111-111111111111',  -- Sarah Johnson
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'LSE-2024-002',
  'active',
  '2024-01-01',
  '2025-12-31',
  3220.00,
  3220.00,
  5,
  TRUE,
  TRUE,
  'Inquilina excelente - Siempre paga a tiempo'
) ON CONFLICT (lease_id) DO NOTHING;

-- LEASE 3: Michael Chen en Orlando, FL (Propiedad de Efrain)
-- Perfil: BUENO - Ocasionalmente 1-2 días tarde pero dentro del grace period
INSERT INTO lease (
  lease_id,
  property_id,
  tenant_person_id,
  portfolio_id,
  lease_number,
  status,
  start_date,
  end_date,
  monthly_rent,
  security_deposit,
  rent_due_day,
  auto_generate_invoices,
  allow_partial_payments,
  notes
) VALUES (
  'lease003-3333-3333-3333-333333333333',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Orlando FL (Efrain)
  '22222222-2222-2222-2222-222222222222',  -- Michael Chen
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'LSE-2024-003',
  'active',
  '2024-03-01',
  '2025-02-28',
  2500.00,
  2500.00,
  1,
  TRUE,
  TRUE,
  'Buen inquilino - Ocasionalmente paga 1-2 días tarde'
) ON CONFLICT (lease_id) DO NOTHING;

-- LEASE 4: Lisa Martinez en Austin, TX (Propiedad de Efrain)
-- Perfil: REGULAR - Paga tarde frecuentemente (5-10 días), acumula late fees
INSERT INTO lease (
  lease_id,
  property_id,
  tenant_person_id,
  portfolio_id,
  lease_number,
  status,
  start_date,
  end_date,
  monthly_rent,
  security_deposit,
  rent_due_day,
  auto_generate_invoices,
  allow_partial_payments,
  notes
) VALUES (
  'lease004-4444-4444-4444-444444444444',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',  -- Austin TX (Efrain)
  '33333333-3333-3333-3333-333333333333',  -- Lisa Martinez
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'LSE-2024-004',
  'active',
  '2024-02-01',
  '2025-01-31',
  3200.00,
  3200.00,
  1,
  TRUE,
  TRUE,
  'Inquilina regular - Paga tarde frecuentemente pero eventualmente paga'
) ON CONFLICT (lease_id) DO NOTHING;

-- LEASE 5: David Thompson en Miami, FL (Propiedad de Ernesto)
-- Perfil: MALO - Pagos parciales, muy tarde, múltiples late fees
INSERT INTO lease (
  lease_id,
  property_id,
  tenant_person_id,
  portfolio_id,
  lease_number,
  status,
  start_date,
  end_date,
  monthly_rent,
  security_deposit,
  rent_due_day,
  auto_generate_invoices,
  allow_partial_payments,
  notes
) VALUES (
  'lease005-5555-5555-5555-555555555555',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',  -- Miami FL (Ernesto)
  '44444444-4444-4444-4444-444444444444',  -- David Thompson
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'LSE-2024-005',
  'active',
  '2024-04-01',
  '2025-03-31',
  3800.00,
  3800.00,
  1,
  TRUE,
  TRUE,
  'Inquilino problemático - Pagos parciales y muy tarde'
) ON CONFLICT (lease_id) DO NOTHING;

-- LEASE 6: Amanda Wilson en Houston, TX (Propiedad de Ernesto)
-- Perfil: MUY MALO - Morosa, no paga, proceso de desalojo
INSERT INTO lease (
  lease_id,
  property_id,
  tenant_person_id,
  portfolio_id,
  lease_number,
  status,
  start_date,
  end_date,
  monthly_rent,
  security_deposit,
  rent_due_day,
  auto_generate_invoices,
  allow_partial_payments,
  notes
) VALUES (
  'lease006-6666-6666-6666-666666666666',
  'dddddddd-1111-1111-1111-111111111111',  -- Houston TX (Ernesto)
  '55555555-5555-5555-5555-555555555555',  -- Amanda Wilson
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'LSE-2024-006',
  'active',
  '2024-05-01',
  '2025-04-30',
  2900.00,
  2900.00,
  1,
  TRUE,
  FALSE,
  'Inquilina morosa - No paga, en proceso de desalojo'
) ON CONFLICT (lease_id) DO NOTHING;

-- =====================================================================
-- 6. CONFIGURAR POLÍTICAS DE LATE FEES
-- =====================================================================

-- Política 1: Para Pedrito (compound - fixed + daily)
INSERT INTO late_fee_policy (
  policy_id,
  lease_id,
  grace_days,
  mode,
  fixed_amount,
  daily_amount,
  max_cap,
  max_applications,
  is_active
) VALUES (
  '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'lease001-1111-1111-1111-111111111111',
  3,
  'compound',
  75.00,
  15.00,
  300.00,
  NULL,
  TRUE
) ON CONFLICT (lease_id) DO NOTHING;

-- Política 2: Para Sarah (fixed - pero nunca se aplica porque paga a tiempo)
INSERT INTO late_fee_policy (
  policy_id,
  lease_id,
  grace_days,
  mode,
  fixed_amount,
  max_cap,
  max_applications,
  is_active
) VALUES (
  '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'lease002-2222-2222-2222-222222222222',
  5,
  'fixed',
  100.00,
  NULL,
  NULL,
  TRUE
) ON CONFLICT (lease_id) DO NOTHING;

-- Política 3: Para Michael (fixed)
INSERT INTO late_fee_policy (
  policy_id,
  lease_id,
  grace_days,
  mode,
  fixed_amount,
  max_cap,
  max_applications,
  is_active
) VALUES (
  '33333333-cccc-cccc-cccc-cccccccccccc',
  'lease003-3333-3333-3333-333333333333',
  3,
  'fixed',
  75.00,
  NULL,
  NULL,
  TRUE
) ON CONFLICT (lease_id) DO NOTHING;

-- Política 4: Para Lisa (percent)
INSERT INTO late_fee_policy (
  policy_id,
  lease_id,
  grace_days,
  mode,
  percent_rate,
  max_cap,
  max_applications,
  is_active
) VALUES (
  '44444444-dddd-dddd-dddd-dddddddddddd',
  'lease004-4444-4444-4444-444444444444',
  3,
  'percent',
  5.00,
  200.00,
  2,
  TRUE
) ON CONFLICT (lease_id) DO NOTHING;

-- Política 5: Para David (daily)
INSERT INTO late_fee_policy (
  policy_id,
  lease_id,
  grace_days,
  mode,
  daily_amount,
  max_cap,
  max_applications,
  is_active
) VALUES (
  '55555555-eeee-eeee-eeee-eeeeeeeeeeee',
  'lease005-5555-5555-5555-555555555555',
  2,
  'daily',
  25.00,
  400.00,
  NULL,
  TRUE
) ON CONFLICT (lease_id) DO NOTHING;

-- Política 6: Para Amanda (compound - agresivo)
INSERT INTO late_fee_policy (
  policy_id,
  lease_id,
  grace_days,
  mode,
  fixed_amount,
  daily_amount,
  max_cap,
  max_applications,
  is_active
) VALUES (
  '66666666-ffff-ffff-ffff-ffffffffffff',
  'lease006-6666-6666-6666-666666666666',
  1,
  'compound',
  100.00,
  20.00,
  500.00,
  NULL,
  TRUE
) ON CONFLICT (lease_id) DO NOTHING;

-- =====================================================================
-- 7. GENERAR FACTURAS HISTÓRICAS
-- =====================================================================

DO $$
DECLARE
  month_date DATE;
BEGIN
  RAISE NOTICE '📅 Generando facturas históricas...';
  
  -- Agosto 2024
  month_date := '2024-08-01'::DATE;
  PERFORM gen_rent_invoices(month_date);
  RAISE NOTICE '   ✓ Agosto 2024';
  
  -- Septiembre 2024
  month_date := '2024-09-01'::DATE;
  PERFORM gen_rent_invoices(month_date);
  RAISE NOTICE '   ✓ Septiembre 2024';
  
  -- Octubre 2024
  month_date := '2024-10-01'::DATE;
  PERFORM gen_rent_invoices(month_date);
  RAISE NOTICE '   ✓ Octubre 2024';
  
  -- Noviembre 2024
  month_date := '2024-11-01'::DATE;
  PERFORM gen_rent_invoices(month_date);
  RAISE NOTICE '   ✓ Noviembre 2024';
  
  -- Diciembre 2024
  month_date := '2024-12-01'::DATE;
  PERFORM gen_rent_invoices(month_date);
  RAISE NOTICE '   ✓ Diciembre 2024';
  
  -- Enero 2025
  month_date := '2025-01-01'::DATE;
  PERFORM gen_rent_invoices(month_date);
  RAISE NOTICE '   ✓ Enero 2025';
  
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- 8. SIMULAR PAGOS REALISTAS POR PERFIL
-- =====================================================================

-- PEDRITO PEREZ (Eagle Mountain, UT) - BUENO: Paga a tiempo
DO $$
DECLARE
  invoices UUID[];
  pay_id UUID;
  i INT;
BEGIN
  RAISE NOTICE '💳 Procesando pagos de Pedrito Perez (BUENO)...';
  
  -- Obtener todas las facturas
  SELECT ARRAY_AGG(invoice_id ORDER BY period_year, period_month) INTO invoices
  FROM rent_invoice 
  WHERE lease_id = 'lease001-1111-1111-1111-111111111111'
    AND period_year >= 2024 AND period_month >= 8;
  
  -- Pagar todas a tiempo
  FOR i IN 1..ARRAY_LENGTH(invoices, 1) LOOP
    INSERT INTO payment_transaction (
      payment_id, lease_id, invoice_id, payment_number, method, 
      amount_usd, fee_usd, status, received_at, payer_name
    ) 
    SELECT 
      gen_random_uuid(),
      'lease001-1111-1111-1111-111111111111',
      invoices[i],
      'PAY-' || TO_CHAR(ri.due_date, 'YYYYMMDD') || '-001',
      'stripe_ach',
      ri.amount_due,
      8.00,
      'succeeded',
      ri.due_date + INTERVAL '0 days',
      'Pedrito Perez'
    FROM rent_invoice ri WHERE invoice_id = invoices[i]
    RETURNING payment_id INTO pay_id;
    
    PERFORM apply_payment_to_invoices(pay_id);
  END LOOP;
  
  RAISE NOTICE '   ✓ Todos los pagos realizados a tiempo';
  RAISE NOTICE '';
END $$;

-- SARAH JOHNSON (Richmond, TX) - EXCELENTE: Siempre paga a tiempo
DO $$
DECLARE
  invoices UUID[];
  pay_id UUID;
  i INT;
BEGIN
  RAISE NOTICE '💳 Procesando pagos de Sarah Johnson (EXCELENTE)...';
  
  SELECT ARRAY_AGG(invoice_id ORDER BY period_year, period_month) INTO invoices
  FROM rent_invoice 
  WHERE lease_id = 'lease002-2222-2222-2222-222222222222';
  
  FOR i IN 1..ARRAY_LENGTH(invoices, 1) LOOP
    INSERT INTO payment_transaction (
      payment_id, lease_id, invoice_id, payment_number, method, 
      amount_usd, fee_usd, status, received_at, payer_name
    ) 
    SELECT 
      gen_random_uuid(),
      'lease002-2222-2222-2222-222222222222',
      invoices[i],
      'PAY-' || TO_CHAR(ri.due_date, 'YYYYMMDD') || '-002',
      'stripe_card',
      ri.amount_due,
      93.68,
      'succeeded',
      ri.due_date - INTERVAL '1 day',  -- Paga 1 día ANTES
      'Sarah Johnson'
    FROM rent_invoice ri WHERE invoice_id = invoices[i]
    RETURNING payment_id INTO pay_id;
    
    PERFORM apply_payment_to_invoices(pay_id);
  END LOOP;
  
  RAISE NOTICE '   ✓ Todos los pagos realizados 1 día antes del vencimiento';
  RAISE NOTICE '';
END $$;

-- MICHAEL CHEN (Orlando, FL) - BUENO: Ocasionalmente 1-2 días tarde
DO $$
DECLARE
  inv RECORD;
  pay_id UUID;
  delay INT;
BEGIN
  RAISE NOTICE '💳 Procesando pagos de Michael Chen (BUENO - ocasionalmente tarde)...';
  
  FOR inv IN
    SELECT * FROM rent_invoice 
    WHERE lease_id = 'lease003-3333-3333-3333-333333333333'
    ORDER BY period_year, period_month
  LOOP
    -- 70% a tiempo, 30% con 1-2 días de retraso
    delay := CASE 
      WHEN RANDOM() < 0.7 THEN 0
      ELSE FLOOR(RANDOM() * 2 + 1)::INT
    END;
    
    INSERT INTO payment_transaction (
      payment_id, lease_id, invoice_id, payment_number, method, 
      amount_usd, fee_usd, status, received_at, payer_name
    ) VALUES (
      gen_random_uuid(),
      'lease003-3333-3333-3333-333333333333',
      inv.invoice_id,
      'PAY-' || TO_CHAR(inv.due_date + delay, 'YYYYMMDD') || '-003',
      'stripe_card',
      inv.amount_due,
      72.80,
      'succeeded',
      inv.due_date + (delay || ' days')::INTERVAL,
      'Michael Chen'
    ) RETURNING payment_id INTO pay_id;
    
    PERFORM apply_payment_to_invoices(pay_id);
  END LOOP;
  
  RAISE NOTICE '   ✓ Pagos realizados (algunos con 1-2 días de retraso)';
  RAISE NOTICE '';
END $$;

-- LISA MARTINEZ (Austin, TX) - REGULAR: Paga tarde frecuentemente (5-10 días)
DO $$
DECLARE
  inv RECORD;
  pay_id UUID;
  delay INT;
BEGIN
  RAISE NOTICE '💳 Procesando pagos de Lisa Martinez (REGULAR - paga tarde)...';
  
  FOR inv IN
    SELECT * FROM rent_invoice 
    WHERE lease_id = 'lease004-4444-4444-4444-444444444444'
    ORDER BY period_year, period_month
  LOOP
    -- Siempre tarde: 5-10 días
    delay := FLOOR(RANDOM() * 6 + 5)::INT;
    
    -- Aplicar late fees primero
    PERFORM apply_late_fees(inv.due_date + (delay || ' days')::INTERVAL);
    
    -- Obtener monto actualizado con late fee
    INSERT INTO payment_transaction (
      payment_id, lease_id, invoice_id, payment_number, method, 
      amount_usd, fee_usd, status, received_at, payer_name
    ) 
    SELECT 
      gen_random_uuid(),
      'lease004-4444-4444-4444-444444444444',
      ri.invoice_id,
      'PAY-' || TO_CHAR(ri.due_date + delay, 'YYYYMMDD') || '-004',
      'check',
      ri.amount_due,
      0.00,
      'succeeded',
      ri.due_date + (delay || ' days')::INTERVAL,
      'Lisa Martinez'
    FROM rent_invoice ri WHERE invoice_id = inv.invoice_id
    RETURNING payment_id INTO pay_id;
    
    PERFORM apply_payment_to_invoices(pay_id);
  END LOOP;
  
  RAISE NOTICE '   ✓ Pagos realizados con 5-10 días de retraso (con late fees)';
  RAISE NOTICE '';
END $$;

-- DAVID THOMPSON (Miami, FL) - MALO: Pagos parciales y muy tarde
DO $$
DECLARE
  inv RECORD;
  pay_id UUID;
  delay INT;
  partial_pct NUMERIC;
BEGIN
  RAISE NOTICE '💳 Procesando pagos de David Thompson (MALO - pagos parciales)...';
  
  FOR inv IN
    SELECT * FROM rent_invoice 
    WHERE lease_id = 'lease005-5555-5555-5555-555555555555'
    ORDER BY period_year, period_month
  LOOP
    -- Muy tarde: 10-20 días
    delay := FLOOR(RANDOM() * 11 + 10)::INT;
    
    -- Aplicar late fees
    PERFORM apply_late_fees(inv.due_date + (delay || ' days')::INTERVAL);
    
    -- 50% hace pagos parciales (50-80% del monto)
    IF RANDOM() < 0.5 THEN
      partial_pct := 0.5 + (RANDOM() * 0.3);
      
      INSERT INTO payment_transaction (
        payment_id, lease_id, invoice_id, payment_number, method, 
        amount_usd, fee_usd, status, received_at, payer_name
      ) 
      SELECT 
        gen_random_uuid(),
        'lease005-5555-5555-5555-555555555555',
        ri.invoice_id,
        'PAY-' || TO_CHAR(ri.due_date + delay, 'YYYYMMDD') || '-005',
        'cash',
        ROUND(ri.amount_due * partial_pct, 2),
        0.00,
        'succeeded',
        ri.due_date + (delay || ' days')::INTERVAL,
        'David Thompson'
      FROM rent_invoice ri WHERE invoice_id = inv.invoice_id
      RETURNING payment_id INTO pay_id;
      
      PERFORM apply_payment_to_invoices(pay_id);
    ELSE
      -- Paga completo pero muy tarde
      INSERT INTO payment_transaction (
        payment_id, lease_id, invoice_id, payment_number, method, 
        amount_usd, fee_usd, status, received_at, payer_name
      ) 
      SELECT 
        gen_random_uuid(),
        'lease005-5555-5555-5555-555555555555',
        ri.invoice_id,
        'PAY-' || TO_CHAR(ri.due_date + delay, 'YYYYMMDD') || '-005',
        'cash',
        ri.amount_due,
        0.00,
        'succeeded',
        ri.due_date + (delay || ' days')::INTERVAL,
        'David Thompson'
      FROM rent_invoice ri WHERE invoice_id = inv.invoice_id
      RETURNING payment_id INTO pay_id;
      
      PERFORM apply_payment_to_invoices(pay_id);
    END IF;
  END LOOP;
  
  RAISE NOTICE '   ⚠️  Pagos realizados con 10-20 días de retraso (algunos parciales)';
  RAISE NOTICE '';
END $$;

-- AMANDA WILSON (Houston, TX) - MUY MALO: NO PAGA (morosa)
DO $$
BEGIN
  RAISE NOTICE '⚠️  Amanda Wilson (MUY MALO - morosa)...';
  RAISE NOTICE '   ❌ NO ha realizado ningún pago';
  RAISE NOTICE '   Aplicando late fees acumulados...';
  
  -- Aplicar late fees para todas las facturas vencidas
  PERFORM apply_late_fees('2025-01-15'::DATE);
  
  RAISE NOTICE '   ⚠️  Múltiples late fees aplicados - En proceso de desalojo';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- 9. CREAR ASIENTOS CONTABLES
-- =====================================================================

DO $$
DECLARE
  pay RECORD;
  count INT := 0;
BEGIN
  RAISE NOTICE '📒 Creando asientos contables...';
  
  FOR pay IN 
    SELECT payment_id 
    FROM payment_transaction 
    WHERE status = 'succeeded'
  LOOP
    PERFORM create_payment_journal_entry(pay.payment_id);
    count := count + 1;
  END LOOP;
  
  RAISE NOTICE '   ✓ %s asientos contables creados', count;
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- 10. REPORTES Y VERIFICACIÓN
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RESUMEN DEL SISTEMA DE COBRO';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '🏠 LEASES ACTIVOS:';
END $$;

-- Resumen de leases
DO $$
DECLARE
  l RECORD;
BEGIN
  FOR l IN
    SELECT 
      l.lease_number,
      p.full_name as tenant,
      pr.address as property,
      l.monthly_rent,
      l.notes
    FROM lease l
    JOIN person p ON p.person_id = l.tenant_person_id
    JOIN property pr ON pr.property_id = l.property_id
    ORDER BY l.lease_number
  LOOP
    RAISE NOTICE '   • % - % ($%)', l.lease_number, l.tenant, l.monthly_rent;
    RAISE NOTICE '     %', SUBSTRING(l.notes, 1, 60);
  END LOOP;
  RAISE NOTICE '';
END $$;

-- Balance por lease
DO $$
BEGIN
  RAISE NOTICE '💰 BALANCE POR LEASE:';
END $$;
DO $$
DECLARE
  b RECORD;
BEGIN
  FOR b IN
    SELECT * FROM v_lease_balance
    ORDER BY total_balance DESC
  LOOP
    RAISE NOTICE '   • % (%)', b.lease_number, b.tenant_name;
    RAISE NOTICE '     Facturado: $% | Pagado: $% | Balance: $%', 
      b.total_billed, b.total_paid, b.total_balance;
    IF b.total_balance > 0 THEN
      RAISE NOTICE '     ⚠️  BALANCE PENDIENTE: $%', b.total_balance;
    ELSE
      RAISE NOTICE '     ✓ Al día';
    END IF;
  END LOOP;
  RAISE NOTICE '';
END $$;

-- Facturas pendientes
DO $$
BEGIN
  RAISE NOTICE '📋 FACTURAS PENDIENTES/VENCIDAS:';
END $$;
DO $$
DECLARE
  inv RECORD;
  count INT := 0;
BEGIN
  FOR inv IN
    SELECT 
      invoice_number,
      tenant_name,
      period_year,
      period_month,
      balance,
      status,
      days_overdue
    FROM v_rent_invoice_detail
    WHERE status IN ('pending', 'partial', 'late')
    ORDER BY days_overdue DESC, period_year, period_month
  LOOP
    count := count + 1;
    RAISE NOTICE '   • % - % (%/%)', 
      inv.invoice_number, 
      inv.tenant_name, 
      inv.period_month, 
      inv.period_year;
    RAISE NOTICE '     Balance: $% | Status: % | Días vencido: %', 
      inv.balance, 
      inv.status, 
      inv.days_overdue;
  END LOOP;
  
  IF count = 0 THEN
    RAISE NOTICE '   ✓ No hay facturas pendientes';
  END IF;
  RAISE NOTICE '';
END $$;

-- Late fees aplicados
DO $$
BEGIN
  RAISE NOTICE '⚠️  LATE FEES APLICADOS:';
END $$;
DO $$
DECLARE
  fee RECORD;
  count INT := 0;
  total NUMERIC(12,2) := 0;
BEGIN
  FOR fee IN
    SELECT 
      i.invoice_number,
      p.full_name as tenant_name,
      i.period_year,
      i.period_month,
      a.amount_delta,
      a.reason
    FROM rent_invoice_adjustment a
    JOIN rent_invoice i ON i.invoice_id = a.invoice_id
    JOIN lease l ON l.lease_id = i.lease_id
    JOIN person p ON p.person_id = l.tenant_person_id
    WHERE a.kind = 'late_fee'
    ORDER BY a.applied_date DESC
    LIMIT 20
  LOOP
    count := count + 1;
    total := total + fee.amount_delta;
    RAISE NOTICE '   • % - % (%/%): $%', 
      fee.tenant_name,
      fee.invoice_number, 
      fee.period_month, 
      fee.period_year,
      fee.amount_delta;
  END LOOP;
  
  IF count > 0 THEN
    RAISE NOTICE '   Total late fees (últimos 20): $%', total;
  ELSE
    RAISE NOTICE '   ✓ No se han aplicado late fees';
  END IF;
  RAISE NOTICE '';
END $$;

-- Resumen por perfil de inquilino
DO $$
BEGIN
  RAISE NOTICE '👥 RESUMEN POR PERFIL DE INQUILINO:';
END $$;
DO $$
DECLARE
  profile RECORD;
BEGIN
  FOR profile IN
    SELECT 
      p.full_name,
      l.notes,
      COUNT(DISTINCT i.invoice_id) as total_invoices,
      COUNT(DISTINCT i.invoice_id) FILTER (WHERE i.status = 'paid') as paid_invoices,
      COUNT(DISTINCT i.invoice_id) FILTER (WHERE i.status IN ('pending','partial','late')) as unpaid_invoices,
      COALESCE(SUM(i.amount_due - i.amount_paid), 0) as balance,
      COUNT(DISTINCT a.adj_id) FILTER (WHERE a.kind = 'late_fee') as late_fees_count,
      COALESCE(SUM(a.amount_delta) FILTER (WHERE a.kind = 'late_fee'), 0) as late_fees_total
    FROM lease l
    JOIN person p ON p.person_id = l.tenant_person_id
    LEFT JOIN rent_invoice i ON i.lease_id = l.lease_id
    LEFT JOIN rent_invoice_adjustment a ON a.invoice_id = i.invoice_id
    GROUP BY p.full_name, l.notes
    ORDER BY balance DESC
  LOOP
    RAISE NOTICE '   • %', profile.full_name;
    RAISE NOTICE '     Perfil: %', SUBSTRING(profile.notes, 1, 50);
    RAISE NOTICE '     Facturas: % pagadas / % pendientes', 
      profile.paid_invoices, profile.unpaid_invoices;
    RAISE NOTICE '     Balance: $%', profile.balance;
    IF profile.late_fees_count > 0 THEN
      RAISE NOTICE '     ⚠️  Late fees: % aplicados ($%)', 
        profile.late_fees_count, profile.late_fees_total;
    END IF;
  END LOOP;
  RAISE NOTICE '';
END $$;

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TEST DATA COMPLETADO EXITOSAMENTE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ESTADÍSTICAS FINALES:';
END $$;
DO $$
DECLARE
  stats RECORD;
BEGIN
  SELECT 
    COUNT(DISTINCT l.lease_id) as total_leases,
    COUNT(DISTINCT i.invoice_id) as total_invoices,
    COUNT(DISTINCT pt.payment_id) as total_payments,
    COALESCE(SUM(i.amount_due), 0) as total_billed,
    COALESCE(SUM(i.amount_paid), 0) as total_paid,
    COALESCE(SUM(i.amount_due - i.amount_paid), 0) as total_outstanding,
    COUNT(DISTINCT a.adj_id) FILTER (WHERE a.kind = 'late_fee') as total_late_fees,
    COALESCE(SUM(a.amount_delta) FILTER (WHERE a.kind = 'late_fee'), 0) as late_fees_amount
  INTO stats
  FROM lease l
  LEFT JOIN rent_invoice i ON i.lease_id = l.lease_id
  LEFT JOIN payment_transaction pt ON pt.lease_id = l.lease_id AND pt.status = 'succeeded'
  LEFT JOIN rent_invoice_adjustment a ON a.invoice_id = i.invoice_id;
  
  RAISE NOTICE '   • Leases activos: %', stats.total_leases;
  RAISE NOTICE '   • Facturas generadas: %', stats.total_invoices;
  RAISE NOTICE '   • Pagos procesados: %', stats.total_payments;
  RAISE NOTICE '   • Total facturado: $%', stats.total_billed;
  RAISE NOTICE '   • Total pagado: $%', stats.total_paid;
  RAISE NOTICE '   • Balance pendiente: $%', stats.total_outstanding;
  RAISE NOTICE '   • Late fees aplicados: % ($%)', stats.total_late_fees, stats.late_fees_amount;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Queries útiles para explorar:';
  RAISE NOTICE '   SELECT * FROM v_lease_balance;';
  RAISE NOTICE '   SELECT * FROM v_rent_invoice_detail WHERE status = ''late'';';
  RAISE NOTICE '   SELECT * FROM v_payment_detail ORDER BY received_at DESC;';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================