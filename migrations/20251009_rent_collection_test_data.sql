-- =====================================================================
-- RENT COLLECTION SYSTEM - TEST DATA
-- =====================================================================
-- Author: Kilo Code
-- Date: 2025-10-09
-- Description: Datos de prueba para demostrar el sistema de cobro
-- =====================================================================

SET search_path = public;

-- =====================================================================
-- 1. CREAR PERSONAS (TENANTS)
-- =====================================================================

-- Tenant 1: María García (Buen pagador)
INSERT INTO person (person_id, kind, full_name, first_name, last_name, primary_email, primary_phone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'individual',
  'María García',
  'María',
  'García',
  'maria.garcia@example.com',
  '+1-555-0101'
) ON CONFLICT (primary_email) DO NOTHING;

-- Tenant 2: Juan Pérez (Pago tardío ocasional)
INSERT INTO person (person_id, kind, full_name, first_name, last_name, primary_email, primary_phone)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'individual',
  'Juan Pérez',
  'Juan',
  'Pérez',
  'juan.perez@example.com',
  '+1-555-0102'
) ON CONFLICT (primary_email) DO NOTHING;

-- Tenant 3: Ana Rodríguez (Moroso)
INSERT INTO person (person_id, kind, full_name, first_name, last_name, primary_email, primary_phone)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'individual',
  'Ana Rodríguez',
  'Ana',
  'Rodríguez',
  'ana.rodriguez@example.com',
  '+1-555-0103'
) ON CONFLICT (primary_email) DO NOTHING;

-- =====================================================================
-- 2. CREAR PROPIEDADES
-- =====================================================================

-- Asumiendo que ya existe un person_id de propietario
DO $$
DECLARE
  owner_id UUID;
BEGIN
  -- Obtener o crear propietario
  SELECT person_id INTO owner_id FROM person WHERE primary_email = 'john@example.com';
  
  IF owner_id IS NULL THEN
    INSERT INTO person (person_id, full_name, primary_email)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      'John Doe',
      'john@example.com'
    )
    RETURNING person_id INTO owner_id;
  END IF;

  -- Propiedad 1: 123 Main St
  INSERT INTO property (property_id, person_id, address, valuation, rent)
  VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    owner_id,
    '123 Main St, Orlando, FL 32801',
    350000,
    1500
  ) ON CONFLICT (property_id) DO NOTHING;

  -- Propiedad 2: 456 Oak Ave
  INSERT INTO property (property_id, person_id, address, valuation, rent)
  VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    owner_id,
    '456 Oak Ave, Orlando, FL 32802',
    425000,
    1800
  ) ON CONFLICT (property_id) DO NOTHING;

  -- Propiedad 3: 789 Pine Rd
  INSERT INTO property (property_id, person_id, address, valuation, rent)
  VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    owner_id,
    '789 Pine Rd, Orlando, FL 32803',
    295000,
    1200
  ) ON CONFLICT (property_id) DO NOTHING;
END $$;

-- =====================================================================
-- 3. CREAR PORTFOLIO
-- =====================================================================

INSERT INTO portfolio (portfolio_id, name)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'Orlando Properties Portfolio'
) ON CONFLICT (portfolio_id) DO NOTHING;

-- =====================================================================
-- 4. CREAR LEASES (CONTRATOS)
-- =====================================================================

-- Lease 1: María García - 123 Main St (Activo, paga a tiempo)
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
  allow_partial_payments
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'LSE-2024-001',
  'active',
  '2024-01-01',
  '2025-12-31',
  1500.00,
  1500.00,
  1,  -- Vence el día 1
  TRUE,
  TRUE
) ON CONFLICT (lease_id) DO NOTHING;

-- Lease 2: Juan Pérez - 456 Oak Ave (Activo, paga tarde ocasionalmente)
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
  allow_partial_payments
) VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'LSE-2024-002',
  'active',
  '2024-03-01',
  '2025-02-28',
  1800.00,
  1800.00,
  5,  -- Vence el día 5
  TRUE,
  TRUE
) ON CONFLICT (lease_id) DO NOTHING;

-- Lease 3: Ana Rodríguez - 789 Pine Rd (Activo, moroso)
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
  allow_partial_payments
) VALUES (
  'ffffffff-1111-1111-1111-111111111111',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '33333333-3333-3333-3333-333333333333',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'LSE-2024-003',
  'active',
  '2024-06-01',
  '2025-05-31',
  1200.00,
  1200.00,
  1,  -- Vence el día 1
  TRUE,
  FALSE  -- No permite pagos parciales
) ON CONFLICT (lease_id) DO NOTHING;

-- =====================================================================
-- 5. CONFIGURAR POLÍTICAS DE LATE FEES
-- =====================================================================

-- Política 1: Para María (fixed + daily)
INSERT INTO late_fee_policy (
  policy_id,
  lease_id,
  grace_days,
  mode,
  fixed_amount,
  daily_amount,
  max_cap,
  max_applications
) VALUES (
  '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  3,
  'compound',
  50.00,
  10.00,
  200.00,
  NULL
) ON CONFLICT (lease_id) DO NOTHING;

-- Política 2: Para Juan (percent)
INSERT INTO late_fee_policy (
  policy_id,
  lease_id,
  grace_days,
  mode,
  percent_rate,
  max_cap,
  max_applications
) VALUES (
  '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  5,
  'percent',
  5.00,  -- 5%
  150.00,
  2
) ON CONFLICT (lease_id) DO NOTHING;

-- Política 3: Para Ana (fixed)
INSERT INTO late_fee_policy (
  policy_id,
  lease_id,
  grace_days,
  mode,
  fixed_amount,
  max_cap,
  max_applications
) VALUES (
  '33333333-cccc-cccc-cccc-cccccccccccc',
  'ffffffff-1111-1111-1111-111111111111',
  2,
  'fixed',
  75.00,
  NULL,
  NULL
) ON CONFLICT (lease_id) DO NOTHING;

-- =====================================================================
-- 6. GENERAR FACTURAS HISTÓRICAS
-- =====================================================================

-- Generar facturas para los últimos 3 meses
DO $$
DECLARE
  month_date DATE;
BEGIN
  -- Octubre 2024
  month_date := '2024-10-01'::DATE;
  PERFORM gen_rent_invoices(month_date);
  
  -- Noviembre 2024
  month_date := '2024-11-01'::DATE;
  PERFORM gen_rent_invoices(month_date);
  
  -- Diciembre 2024
  month_date := '2024-12-01'::DATE;
  PERFORM gen_rent_invoices(month_date);
  
  -- Enero 2025
  month_date := '2025-01-01'::DATE;
  PERFORM gen_rent_invoices(month_date);
END $$;

-- =====================================================================
-- 7. SIMULAR PAGOS
-- =====================================================================

-- María García: Paga todo a tiempo (Octubre, Noviembre, Diciembre)
DO $$
DECLARE
  inv_oct UUID;
  inv_nov UUID;
  inv_dec UUID;
  pay_id UUID;
BEGIN
  -- Obtener facturas de María
  SELECT invoice_id INTO inv_oct FROM rent_invoice 
  WHERE lease_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' 
    AND period_year = 2024 AND period_month = 10;
  
  SELECT invoice_id INTO inv_nov FROM rent_invoice 
  WHERE lease_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' 
    AND period_year = 2024 AND period_month = 11;
  
  SELECT invoice_id INTO inv_dec FROM rent_invoice 
  WHERE lease_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' 
    AND period_year = 2024 AND period_month = 12;

  -- Pago Octubre (a tiempo)
  INSERT INTO payment_transaction (
    payment_id, lease_id, invoice_id, payment_number, method, 
    amount_usd, fee_usd, status, received_at
  ) VALUES (
    gen_random_uuid(),
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    inv_oct,
    'PAY-20241001-001',
    'stripe_card',
    1500.00,
    43.80,
    'succeeded',
    '2024-10-01 10:30:00'
  ) RETURNING payment_id INTO pay_id;
  PERFORM apply_payment_to_invoices(pay_id);

  -- Pago Noviembre (a tiempo)
  INSERT INTO payment_transaction (
    payment_id, lease_id, invoice_id, payment_number, method, 
    amount_usd, fee_usd, status, received_at
  ) VALUES (
    gen_random_uuid(),
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    inv_nov,
    'PAY-20241101-001',
    'stripe_ach',
    1500.00,
    8.00,
    'succeeded',
    '2024-11-01 09:15:00'
  ) RETURNING payment_id INTO pay_id;
  PERFORM apply_payment_to_invoices(pay_id);

  -- Pago Diciembre (a tiempo)
  INSERT INTO payment_transaction (
    payment_id, lease_id, invoice_id, payment_number, method, 
    amount_usd, fee_usd, status, received_at
  ) VALUES (
    gen_random_uuid(),
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    inv_dec,
    'PAY-20241201-001',
    'stripe_card',
    1500.00,
    43.80,
    'succeeded',
    '2024-12-01 11:00:00'
  ) RETURNING payment_id INTO pay_id;
  PERFORM apply_payment_to_invoices(pay_id);
END $$;

-- Juan Pérez: Paga tarde en Noviembre
DO $$
DECLARE
  inv_oct UUID;
  inv_nov UUID;
  inv_dec UUID;
  pay_id UUID;
BEGIN
  SELECT invoice_id INTO inv_oct FROM rent_invoice 
  WHERE lease_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' 
    AND period_year = 2024 AND period_month = 10;
  
  SELECT invoice_id INTO inv_nov FROM rent_invoice 
  WHERE lease_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' 
    AND period_year = 2024 AND period_month = 11;
  
  SELECT invoice_id INTO inv_dec FROM rent_invoice 
  WHERE lease_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' 
    AND period_year = 2024 AND period_month = 12;

  -- Pago Octubre (a tiempo)
  INSERT INTO payment_transaction (
    payment_id, lease_id, invoice_id, payment_number, method, 
    amount_usd, fee_usd, status, received_at
  ) VALUES (
    gen_random_uuid(),
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    inv_oct,
    'PAY-20241005-002',
    'check',
    1800.00,
    0.00,
    'succeeded',
    '2024-10-05 14:00:00'
  ) RETURNING payment_id INTO pay_id;
  PERFORM apply_payment_to_invoices(pay_id);

  -- Pago Noviembre (12 días tarde - después de grace period)
  -- Primero aplicar late fee
  PERFORM apply_late_fees('2024-11-17'::DATE);
  
  -- Luego pagar (con late fee incluido)
  INSERT INTO payment_transaction (
    payment_id, lease_id, invoice_id, payment_number, method, 
    amount_usd, fee_usd, status, received_at
  ) VALUES (
    gen_random_uuid(),
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    inv_nov,
    'PAY-20241117-002',
    'stripe_card',
    1890.00,  -- $1800 + $90 late fee (5%)
    55.11,
    'succeeded',
    '2024-11-17 16:30:00'
  ) RETURNING payment_id INTO pay_id;
  PERFORM apply_payment_to_invoices(pay_id);

  -- Pago Diciembre (a tiempo)
  INSERT INTO payment_transaction (
    payment_id, lease_id, invoice_id, payment_number, method, 
    amount_usd, fee_usd, status, received_at
  ) VALUES (
    gen_random_uuid(),
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    inv_dec,
    'PAY-20241205-002',
    'stripe_ach',
    1800.00,
    8.00,
    'succeeded',
    '2024-12-05 10:00:00'
  ) RETURNING payment_id INTO pay_id;
  PERFORM apply_payment_to_invoices(pay_id);
END $$;

-- Ana Rodríguez: No ha pagado nada (morosa)
-- Solo aplicar late fees
DO $$
BEGIN
  -- Aplicar late fees para Octubre (muy atrasado)
  PERFORM apply_late_fees('2024-11-15'::DATE);
  
  -- Aplicar late fees para Noviembre (atrasado)
  PERFORM apply_late_fees('2024-12-15'::DATE);
  
  -- Aplicar late fees para Diciembre (recién vencido)
  PERFORM apply_late_fees('2025-01-10'::DATE);
END $$;

-- =====================================================================
-- 8. CREAR ASIENTOS CONTABLES PARA PAGOS EXITOSOS
-- =====================================================================

DO $$
DECLARE
  pay RECORD;
BEGIN
  FOR pay IN 
    SELECT payment_id 
    FROM payment_transaction 
    WHERE status = 'succeeded'
  LOOP
    PERFORM create_payment_journal_entry(pay.payment_id);
  END LOOP;
END $$;

-- =====================================================================
-- 9. VERIFICACIÓN DE DATOS
-- =====================================================================

-- Mostrar resumen de leases
SELECT 
  l.lease_number,
  p.full_name as tenant,
  pr.address as property,
  l.monthly_rent,
  l.status
FROM lease l
JOIN person p ON p.person_id = l.tenant_person_id
JOIN property pr ON pr.property_id = l.property_id
ORDER BY l.lease_number;

-- Mostrar balance por lease
SELECT * FROM v_lease_balance
ORDER BY total_balance DESC;

-- Mostrar facturas pendientes
SELECT 
  invoice_number,
  tenant_name,
  period_year,
  period_month,
  amount_due,
  amount_paid,
  balance,
  status,
  days_overdue
FROM v_rent_invoice_detail
WHERE status IN ('pending', 'partial', 'late')
ORDER BY days_overdue DESC, period_year, period_month;

-- Mostrar late fees aplicados
SELECT 
  i.invoice_number,
  i.period_year,
  i.period_month,
  a.kind,
  a.amount_delta,
  a.reason,
  a.applied_date
FROM rent_invoice_adjustment a
JOIN rent_invoice i ON i.invoice_id = a.invoice_id
WHERE a.kind = 'late_fee'
ORDER BY a.applied_date DESC;

-- Mostrar pagos recibidos
SELECT 
  payment_number,
  tenant_name,
  method,
  amount_usd,
  fee_usd,
  net_amount,
  status,
  received_at
FROM v_payment_detail
ORDER BY received_at DESC;

-- =====================================================================
-- FIN DEL SCRIPT DE TEST DATA
-- =====================================================================

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Test data created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '   - 3 Tenants created';
  RAISE NOTICE '   - 3 Properties created';
  RAISE NOTICE '   - 3 Active leases created';
  RAISE NOTICE '   - 3 Late fee policies configured';
  RAISE NOTICE '   - 12 Invoices generated (4 months × 3 leases)';
  RAISE NOTICE '   - 7 Payments processed';
  RAISE NOTICE '   - Late fees applied to overdue invoices';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Run these queries to explore:';
  RAISE NOTICE '   SELECT * FROM v_lease_balance;';
  RAISE NOTICE '   SELECT * FROM v_rent_invoice_detail WHERE status = ''late'';';
  RAISE NOTICE '   SELECT * FROM v_payment_detail;';
END $$;