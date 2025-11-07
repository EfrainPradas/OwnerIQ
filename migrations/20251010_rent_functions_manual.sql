-- =====================================================================
-- FUNCIONES PARA PROCESO MANUAL DE COBRO DE RENTA
-- =====================================================================
-- Author: Kilo Code
-- Date: 2025-10-10
-- Description: Funciones SQL para gestión manual de rentas
-- =====================================================================

SET search_path = public;

-- =====================================================================
-- 1. FUNCIÓN: APLICAR LATE FEES MANUALMENTE
-- =====================================================================

CREATE OR REPLACE FUNCTION apply_late_fees_manual(
  p_invoice_id UUID,
  p_today DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  fee_applied BOOLEAN,
  fee_amount NUMERIC(12,2),
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  inv RECORD;
  pol RECORD;
  fee NUMERIC(12,2) := 0;
  days_late INT;
  existing_fees INT;
BEGIN
  -- Obtener factura
  SELECT * INTO inv FROM rent_invoice WHERE invoice_id = p_invoice_id;
  
  IF inv IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 'Factura no encontrada';
    RETURN;
  END IF;
  
  -- Verificar si ya está pagada
  IF inv.status = 'paid' THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 'Factura ya está pagada';
    RETURN;
  END IF;
  
  -- Buscar política de late fee
  SELECT * INTO pol FROM late_fee_policy 
  WHERE lease_id = inv.lease_id AND is_active = TRUE;
  
  IF pol IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 'No hay política de late fees configurada';
    RETURN;
  END IF;
  
  -- Calcular días de retraso
  days_late := GREATEST((p_today - (inv.due_date + pol.grace_days)), 0);
  
  IF days_late <= 0 THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 
      format('Aún en período de gracia (%s días)', pol.grace_days);
    RETURN;
  END IF;
  
  -- Verificar límite de aplicaciones
  SELECT COUNT(*) INTO existing_fees
  FROM rent_invoice_adjustment
  WHERE invoice_id = p_invoice_id AND kind = 'late_fee';
  
  IF pol.max_applications IS NOT NULL AND existing_fees >= pol.max_applications THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 
      format('Límite de late fees alcanzado (%s aplicaciones)', pol.max_applications);
    RETURN;
  END IF;
  
  -- Calcular fee según modo
  CASE pol.mode
    WHEN 'fixed' THEN
      fee := COALESCE(pol.fixed_amount, 0);
      
    WHEN 'percent' THEN
      fee := ROUND((COALESCE(pol.percent_rate, 0) / 100.0) * inv.amount_due, 2);
      
    WHEN 'daily' THEN
      fee := COALESCE(pol.daily_amount, 0) * days_late;
      
    WHEN 'compound' THEN
      fee := COALESCE(pol.fixed_amount, 0) + (COALESCE(pol.daily_amount, 0) * days_late);
  END CASE;
  
  -- Aplicar tope si existe
  IF pol.max_cap IS NOT NULL THEN
    fee := LEAST(fee, pol.max_cap);
  END IF;
  
  IF fee <= 0 THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 'Fee calculado es $0';
    RETURN;
  END IF;
  
  -- Insertar ajuste
  INSERT INTO rent_invoice_adjustment (invoice_id, kind, amount_delta, reason)
  VALUES (
    p_invoice_id,
    'late_fee',
    fee,
    format('Late fee: %s días de retraso (gracia: %s días)', days_late, pol.grace_days)
  );
  
  -- Actualizar factura
  UPDATE rent_invoice
  SET 
    amount_due = amount_due + fee,
    status = CASE 
      WHEN amount_paid >= (amount_due + fee) THEN 'paid'
      WHEN amount_paid > 0 THEN 'partial'
      ELSE 'late'
    END
  WHERE invoice_id = p_invoice_id;
  
  RETURN QUERY SELECT TRUE, fee, format('Late fee de $%s aplicado exitosamente', fee);
END;
$$;

COMMENT ON FUNCTION apply_late_fees_manual IS 
'Aplica late fee a una factura específica de forma manual';

-- =====================================================================
-- 2. FUNCIÓN: REGISTRAR PAGO MANUAL
-- =====================================================================

CREATE OR REPLACE FUNCTION register_payment_manual(
  p_lease_id UUID,
  p_amount NUMERIC(12,2),
  p_method TEXT,
  p_payer_name TEXT DEFAULT NULL,
  p_received_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  payment_id UUID,
  invoices_affected INT,
  amount_applied NUMERIC(12,2),
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  new_payment_id UUID;
  payment_num TEXT;
  inv RECORD;
  amt NUMERIC(12,2);
  to_apply NUMERIC(12,2);
  missing NUMERIC(12,2);
  affected INT := 0;
  applied NUMERIC(12,2) := 0;
BEGIN
  -- Validar lease existe
  IF NOT EXISTS (SELECT 1 FROM lease WHERE lease_id = p_lease_id) THEN
    RAISE EXCEPTION 'Lease % no encontrado', p_lease_id;
  END IF;
  
  -- Generar número de pago
  payment_num := format('PAY-%s-%s', 
    to_char(p_received_date, 'YYYYMMDD'),
    substring(gen_random_uuid()::TEXT, 1, 8)
  );
  
  -- Crear transacción de pago
  INSERT INTO payment_transaction (
    payment_id,
    lease_id,
    payment_number,
    method,
    amount_usd,
    fee_usd,
    status,
    received_at,
    payer_name
  ) VALUES (
    gen_random_uuid(),
    p_lease_id,
    payment_num,
    p_method,
    p_amount,
    0,
    'succeeded',
    p_received_date::TIMESTAMPTZ,
    p_payer_name
  )
  RETURNING payment_transaction.payment_id INTO new_payment_id;
  
  -- Aplicar a facturas pendientes (FIFO)
  amt := p_amount;
  
  FOR inv IN
    SELECT *
    FROM rent_invoice
    WHERE lease_id = p_lease_id 
      AND status IN ('pending', 'partial', 'late')
      AND (amount_due - amount_paid) > 0
    ORDER BY period_year, period_month, due_date
  LOOP
    EXIT WHEN amt <= 0;
    
    missing := (inv.amount_due - inv.amount_paid);
    
    IF missing <= 0 THEN 
      CONTINUE; 
    END IF;
    
    to_apply := LEAST(amt, missing);
    
    -- Actualizar factura
    UPDATE rent_invoice
    SET 
      amount_paid = amount_paid + to_apply,
      status = CASE 
        WHEN (amount_paid + to_apply) >= amount_due THEN 'paid'
        ELSE 'partial'
      END
    WHERE invoice_id = inv.invoice_id;
    
    -- Vincular pago a primera factura si no está vinculado
    IF affected = 0 THEN
      UPDATE payment_transaction
      SET invoice_id = inv.invoice_id
      WHERE payment_transaction.payment_id = new_payment_id;
    END IF;
    
    amt := amt - to_apply;
    applied := applied + to_apply;
    affected := affected + 1;
  END LOOP;
  
  RETURN QUERY SELECT 
    new_payment_id,
    affected,
    applied,
    format('Pago de $%s registrado. %s factura(s) afectada(s)', p_amount, affected);
END;
$$;

COMMENT ON FUNCTION register_payment_manual IS 
'Registra un pago manual y lo aplica automáticamente a facturas pendientes (FIFO)';

-- =====================================================================
-- 3. FUNCIÓN: CREAR FACTURA MANUAL
-- =====================================================================

CREATE OR REPLACE FUNCTION create_invoice_manual(
  p_lease_id UUID,
  p_year INT,
  p_month INT,
  p_amount NUMERIC(12,2) DEFAULT NULL
)
RETURNS TABLE(
  invoice_id UUID,
  invoice_number TEXT,
  amount NUMERIC(12,2),
  due_date DATE,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  l RECORD;
  new_invoice_id UUID;
  inv_number TEXT;
  inv_amount NUMERIC(12,2);
  inv_due_date DATE;
BEGIN
  -- Obtener lease
  SELECT * INTO l FROM lease WHERE lease_id = p_lease_id;
  
  IF l IS NULL THEN
    RAISE EXCEPTION 'Lease % no encontrado', p_lease_id;
  END IF;
  
  -- Usar monto del lease si no se especifica
  inv_amount := COALESCE(p_amount, l.monthly_rent);
  
  -- Calcular fecha de vencimiento
  inv_due_date := make_date(p_year, p_month, 
    LEAST(l.rent_due_day, 
      EXTRACT(DAY FROM (make_date(p_year, p_month, 1) + INTERVAL '1 month - 1 day')::DATE)::INT
    )
  );
  
  -- Generar número de factura
  inv_number := format('INV-%s-%s%02d', 
    COALESCE(l.lease_number, p_lease_id::TEXT), 
    p_year, 
    p_month
  );
  
  -- Crear factura
  INSERT INTO rent_invoice (
    invoice_id,
    lease_id,
    period_year,
    period_month,
    invoice_number,
    amount_due,
    due_date,
    status
  ) VALUES (
    gen_random_uuid(),
    p_lease_id,
    p_year,
    p_month,
    inv_number,
    inv_amount,
    inv_due_date,
    'pending'
  )
  RETURNING rent_invoice.invoice_id INTO new_invoice_id;
  
  RETURN QUERY SELECT 
    new_invoice_id,
    inv_number,
    inv_amount,
    inv_due_date,
    format('Factura %s creada por $%s, vence %s', inv_number, inv_amount, inv_due_date);
    
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe una factura para este lease en %/%', p_month, p_year;
END;
$$;

COMMENT ON FUNCTION create_invoice_manual IS 
'Crea una factura manual para un lease específico';

-- =====================================================================
-- 4. FUNCIÓN: APLICAR DESCUENTO/CRÉDITO
-- =====================================================================

CREATE OR REPLACE FUNCTION apply_adjustment_manual(
  p_invoice_id UUID,
  p_kind TEXT,
  p_amount NUMERIC(12,2),
  p_reason TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  new_amount_due NUMERIC(12,2),
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  inv RECORD;
  adj_amount NUMERIC(12,2);
BEGIN
  -- Validar tipo de ajuste
  IF p_kind NOT IN ('late_fee', 'discount', 'misc', 'credit') THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 
      'Tipo de ajuste inválido. Use: late_fee, discount, misc, credit';
    RETURN;
  END IF;
  
  -- Obtener factura
  SELECT * INTO inv FROM rent_invoice WHERE invoice_id = p_invoice_id;
  
  IF inv IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 'Factura no encontrada';
    RETURN;
  END IF;
  
  -- Para descuentos y créditos, el monto debe ser negativo
  IF p_kind IN ('discount', 'credit') AND p_amount > 0 THEN
    adj_amount := -p_amount;
  ELSE
    adj_amount := p_amount;
  END IF;
  
  -- Insertar ajuste
  INSERT INTO rent_invoice_adjustment (invoice_id, kind, amount_delta, reason)
  VALUES (p_invoice_id, p_kind, adj_amount, p_reason);
  
  -- Actualizar factura
  UPDATE rent_invoice
  SET 
    amount_due = amount_due + adj_amount,
    status = CASE 
      WHEN amount_paid >= (amount_due + adj_amount) THEN 'paid'
      WHEN amount_paid > 0 THEN 'partial'
      WHEN (amount_due + adj_amount) > 0 AND due_date < CURRENT_DATE THEN 'late'
      ELSE status
    END
  WHERE invoice_id = p_invoice_id
  RETURNING amount_due INTO adj_amount;
  
  RETURN QUERY SELECT 
    TRUE,
    adj_amount,
    format('Ajuste aplicado. Nuevo monto: $%s', adj_amount);
END;
$$;

COMMENT ON FUNCTION apply_adjustment_manual IS 
'Aplica un ajuste manual (descuento, crédito, cargo) a una factura';

-- =====================================================================
-- 5. VISTAS ÚTILES PARA CONSULTAS
-- =====================================================================

-- Vista de facturas con detalles
CREATE OR REPLACE VIEW v_invoice_details AS
SELECT 
  i.invoice_id,
  i.invoice_number,
  i.period_year,
  i.period_month,
  i.due_date,
  i.amount_due,
  i.amount_paid,
  (i.amount_due - i.amount_paid) AS balance,
  i.status,
  CASE 
    WHEN i.status = 'paid' THEN 0
    WHEN i.due_date < CURRENT_DATE THEN CURRENT_DATE - i.due_date
    ELSE 0
  END AS days_overdue,
  l.lease_number,
  l.monthly_rent,
  p.full_name AS tenant_name,
  p.primary_email AS tenant_email,
  p.primary_phone AS tenant_phone,
  pr.address AS property_address
FROM rent_invoice i
JOIN lease l ON l.lease_id = i.lease_id
JOIN person p ON p.person_id = l.tenant_person_id
JOIN property pr ON pr.property_id = l.property_id;

-- Vista de pagos con detalles
CREATE OR REPLACE VIEW v_payment_details AS
SELECT 
  pt.payment_id,
  pt.payment_number,
  pt.method,
  pt.amount_usd,
  pt.fee_usd,
  pt.status,
  pt.received_at,
  pt.payer_name,
  l.lease_number,
  p.full_name AS tenant_name,
  i.invoice_number,
  i.period_year,
  i.period_month
FROM payment_transaction pt
JOIN lease l ON l.lease_id = pt.lease_id
JOIN person p ON p.person_id = l.tenant_person_id
LEFT JOIN rent_invoice i ON i.invoice_id = pt.invoice_id;

-- Vista de balance por lease
CREATE OR REPLACE VIEW v_lease_balance AS
SELECT 
  l.lease_id,
  l.lease_number,
  l.property_id,
  l.tenant_person_id,
  p.full_name AS tenant_name,
  p.primary_email AS tenant_email,
  COUNT(DISTINCT i.invoice_id) AS total_invoices,
  COUNT(DISTINCT i.invoice_id) FILTER (WHERE i.status = 'paid') AS paid_invoices,
  COUNT(DISTINCT i.invoice_id) FILTER (WHERE i.status IN ('pending', 'partial', 'late')) AS unpaid_invoices,
  COALESCE(SUM(i.amount_due), 0) AS total_billed,
  COALESCE(SUM(i.amount_paid), 0) AS total_paid,
  COALESCE(SUM(i.amount_due - i.amount_paid), 0) AS total_balance,
  MAX(i.due_date) FILTER (WHERE i.status IN ('pending', 'partial', 'late')) AS next_due_date
FROM lease l
JOIN person p ON p.person_id = l.tenant_person_id
LEFT JOIN rent_invoice i ON i.lease_id = l.lease_id
WHERE l.status = 'active'
GROUP BY l.lease_id, l.lease_number, l.property_id, l.tenant_person_id, p.full_name, p.primary_email;

-- =====================================================================
-- 6. EJEMPLOS DE USO
-- =====================================================================

-- Ejemplo 1: Crear factura manual
-- SELECT * FROM create_invoice_manual('lease-uuid', 2025, 1, 1500.00);

-- Ejemplo 2: Registrar pago
-- SELECT * FROM register_payment_manual('lease-uuid', 1500.00, 'cash', 'Juan Perez', '2025-01-05');

-- Ejemplo 3: Aplicar late fee
-- SELECT * FROM apply_late_fees_manual('invoice-uuid', CURRENT_DATE);

-- Ejemplo 4: Aplicar descuento
-- SELECT * FROM apply_adjustment_manual('invoice-uuid', 'discount', 100.00, 'Descuento por pago anticipado');

-- Ejemplo 5: Ver facturas pendientes
-- SELECT * FROM v_invoice_details WHERE status IN ('pending', 'late') ORDER BY days_overdue DESC;

-- Ejemplo 6: Ver balance por lease
-- SELECT * FROM v_lease_balance WHERE total_balance > 0 ORDER BY total_balance DESC;

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================