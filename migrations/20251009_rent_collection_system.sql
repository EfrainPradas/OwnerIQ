-- =====================================================================
-- RENT COLLECTION SYSTEM - Complete Implementation
-- =====================================================================
-- Author: Kilo Code
-- Date: 2025-10-09
-- Description: Sistema completo de cobro de alquiler con facturación,
--              pagos, late fees, y contabilidad integrada
-- =====================================================================

SET search_path = public;

-- =====================================================================
-- 1. ENUMS Y TIPOS
-- =====================================================================

DO $$ BEGIN
  CREATE TYPE lease_status AS ENUM ('draft','active','expired','terminated','renewed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('pending','partial','paid','late','void','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('stripe_card','stripe_ach','cash','check','wire','zelle','venmo','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('initiated','pending','succeeded','failed','refunded','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE adjustment_kind AS ENUM ('late_fee','discount','credit','misc','refund','proration');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE late_fee_mode AS ENUM ('fixed','percent','daily','compound');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('asset','liability','equity','income','expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dr_cr AS ENUM ('DR','CR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================================
-- 2. TABLA DE LEASES (CONTRATOS DE ARRENDAMIENTO)
-- =====================================================================

CREATE TABLE IF NOT EXISTS lease (
  lease_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id       UUID NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  tenant_person_id  UUID NOT NULL REFERENCES person(person_id) ON DELETE RESTRICT,
  portfolio_id      UUID REFERENCES portfolio(portfolio_id) ON DELETE SET NULL,
  
  -- Términos del contrato
  lease_number      TEXT UNIQUE,
  status            lease_status NOT NULL DEFAULT 'draft',
  start_date        DATE NOT NULL,
  end_date          DATE,
  
  -- Términos financieros
  monthly_rent      NUMERIC(10,2) NOT NULL CHECK (monthly_rent > 0),
  security_deposit  NUMERIC(10,2) NOT NULL DEFAULT 0,
  rent_due_day      INT NOT NULL DEFAULT 1 CHECK (rent_due_day BETWEEN 1 AND 31),
  
  -- Configuración de pagos
  auto_generate_invoices BOOLEAN NOT NULL DEFAULT TRUE,
  allow_partial_payments BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  notes             TEXT,
  document_url      TEXT,
  signed_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by        UUID,
  
  -- Constraints
  CONSTRAINT valid_lease_dates CHECK (end_date IS NULL OR end_date > start_date)
);

-- Índices para lease
CREATE INDEX IF NOT EXISTS idx_lease_property ON lease(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_tenant ON lease(tenant_person_id);
CREATE INDEX IF NOT EXISTS idx_lease_status ON lease(status);
CREATE INDEX IF NOT EXISTS idx_lease_dates ON lease(start_date, end_date);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_lease_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lease_updated
  BEFORE UPDATE ON lease
  FOR EACH ROW
  EXECUTE FUNCTION update_lease_timestamp();

-- =====================================================================
-- 3. TABLA DE FACTURAS/INVOICES
-- =====================================================================

CREATE TABLE IF NOT EXISTS rent_invoice (
  invoice_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id          UUID NOT NULL REFERENCES lease(lease_id) ON DELETE CASCADE,
  
  -- Período de facturación
  period_year       INT NOT NULL CHECK (period_year >= 2000),
  period_month      INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  invoice_number    TEXT UNIQUE,
  
  -- Fechas importantes
  issue_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date          DATE NOT NULL,
  paid_date         DATE,
  
  -- Montos
  base_amount       NUMERIC(12,2) NOT NULL CHECK (base_amount >= 0),
  adjustments_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_due        NUMERIC(12,2) NOT NULL CHECK (amount_due >= 0),
  amount_paid       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  
  -- Estado y metadata
  status            invoice_status NOT NULL DEFAULT 'pending',
  notes             TEXT,
  reminder_sent_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE (lease_id, period_year, period_month),
  CONSTRAINT valid_amounts CHECK (amount_paid <= amount_due)
);

-- Índices para rent_invoice
CREATE INDEX IF NOT EXISTS idx_invoice_lease ON rent_invoice(lease_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON rent_invoice(status);
CREATE INDEX IF NOT EXISTS idx_invoice_due_date ON rent_invoice(due_date);
CREATE INDEX IF NOT EXISTS idx_invoice_period ON rent_invoice(period_year, period_month);

-- Trigger para actualizar updated_at
CREATE TRIGGER trg_invoice_updated
  BEFORE UPDATE ON rent_invoice
  FOR EACH ROW
  EXECUTE FUNCTION update_lease_timestamp();

-- =====================================================================
-- 4. TABLA DE AJUSTES A FACTURAS (LATE FEES, DESCUENTOS, ETC)
-- =====================================================================

CREATE TABLE IF NOT EXISTS rent_invoice_adjustment (
  adj_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID NOT NULL REFERENCES rent_invoice(invoice_id) ON DELETE CASCADE,
  
  -- Tipo y monto
  kind              adjustment_kind NOT NULL,
  amount_delta      NUMERIC(12,2) NOT NULL,  -- positivo = cargo, negativo = crédito
  
  -- Metadata
  reason            TEXT NOT NULL,
  applied_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  applied_by        UUID,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT non_zero_adjustment CHECK (amount_delta != 0)
);

-- Índices para adjustments
CREATE INDEX IF NOT EXISTS idx_adjustment_invoice ON rent_invoice_adjustment(invoice_id);
CREATE INDEX IF NOT EXISTS idx_adjustment_kind ON rent_invoice_adjustment(kind);
CREATE INDEX IF NOT EXISTS idx_adjustment_date ON rent_invoice_adjustment(applied_date);

-- =====================================================================
-- 5. TABLA DE POLÍTICAS DE LATE FEES
-- =====================================================================

CREATE TABLE IF NOT EXISTS late_fee_policy (
  policy_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id          UUID UNIQUE REFERENCES lease(lease_id) ON DELETE CASCADE,
  portfolio_id      UUID REFERENCES portfolio(portfolio_id) ON DELETE CASCADE,
  
  -- Configuración de grace period
  grace_days        INT NOT NULL DEFAULT 3 CHECK (grace_days >= 0),
  
  -- Modo de cálculo
  mode              late_fee_mode NOT NULL DEFAULT 'fixed',
  
  -- Montos según modo
  fixed_amount      NUMERIC(10,2) CHECK (fixed_amount >= 0),
  percent_rate      NUMERIC(6,3) CHECK (percent_rate >= 0 AND percent_rate <= 100),
  daily_amount      NUMERIC(10,2) CHECK (daily_amount >= 0),
  
  -- Límites
  max_cap           NUMERIC(10,2) CHECK (max_cap >= 0),
  max_applications  INT CHECK (max_applications > 0),  -- máximo de veces que se aplica
  
  -- Control
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraint: debe tener lease_id O portfolio_id (no ambos)
  CONSTRAINT policy_scope CHECK (
    (lease_id IS NOT NULL AND portfolio_id IS NULL) OR
    (lease_id IS NULL AND portfolio_id IS NOT NULL)
  )
);

-- Índices para late_fee_policy
CREATE INDEX IF NOT EXISTS idx_policy_lease ON late_fee_policy(lease_id);
CREATE INDEX IF NOT EXISTS idx_policy_portfolio ON late_fee_policy(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_policy_active ON late_fee_policy(is_active);

-- =====================================================================
-- 6. TABLA DE TRANSACCIONES DE PAGO
-- =====================================================================

CREATE TABLE IF NOT EXISTS payment_transaction (
  payment_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID REFERENCES rent_invoice(invoice_id) ON DELETE SET NULL,
  lease_id          UUID NOT NULL REFERENCES lease(lease_id) ON DELETE CASCADE,
  
  -- Información del pago
  payment_number    TEXT UNIQUE,
  method            payment_method NOT NULL,
  external_id       TEXT,  -- ID del procesador (Stripe, etc)
  
  -- Montos
  amount_usd        NUMERIC(12,2) NOT NULL CHECK (amount_usd > 0),
  fee_usd           NUMERIC(12,2) DEFAULT 0 CHECK (fee_usd >= 0),
  net_amount        NUMERIC(12,2) GENERATED ALWAYS AS (amount_usd - fee_usd) STORED,
  
  -- Estado y fechas
  status            payment_status NOT NULL DEFAULT 'initiated',
  initiated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at       TIMESTAMPTZ,
  confirmed_at      TIMESTAMPTZ,
  
  -- Metadata
  payer_name        TEXT,
  reference_number  TEXT,
  notes             TEXT,
  payload           JSONB,  -- webhook data completa
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para payment_transaction
CREATE INDEX IF NOT EXISTS idx_payment_invoice ON payment_transaction(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_lease ON payment_transaction(lease_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transaction(status);
CREATE INDEX IF NOT EXISTS idx_payment_method ON payment_transaction(method);
CREATE INDEX IF NOT EXISTS idx_payment_external ON payment_transaction(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_received ON payment_transaction(received_at);

-- Trigger para actualizar updated_at
CREATE TRIGGER trg_payment_updated
  BEFORE UPDATE ON payment_transaction
  FOR EACH ROW
  EXECUTE FUNCTION update_lease_timestamp();

-- =====================================================================
-- 7. TABLAS DE CONTABILIDAD (ACCOUNTING)
-- =====================================================================

-- Catálogo de cuentas contables
CREATE TABLE IF NOT EXISTS account (
  account_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id      UUID REFERENCES portfolio(portfolio_id) ON DELETE CASCADE,
  
  -- Identificación
  code              TEXT NOT NULL,
  name              TEXT NOT NULL,
  type              account_type NOT NULL,
  
  -- Jerarquía
  parent_account_id UUID REFERENCES account(account_id) ON DELETE SET NULL,
  
  -- Control
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE (portfolio_id, code)
);

CREATE INDEX IF NOT EXISTS idx_account_portfolio ON account(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_account_type ON account(type);
CREATE INDEX IF NOT EXISTS idx_account_code ON account(code);

-- Asientos contables (journal entries)
CREATE TABLE IF NOT EXISTS journal_entry (
  journal_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id      UUID REFERENCES portfolio(portfolio_id) ON DELETE CASCADE,
  
  -- Información del asiento
  entry_number      TEXT UNIQUE,
  entry_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  memo              TEXT NOT NULL,
  
  -- Referencias
  reference_type    TEXT,  -- 'payment', 'invoice', 'adjustment', etc
  reference_id      UUID,
  
  -- Control
  is_posted         BOOLEAN NOT NULL DEFAULT FALSE,
  posted_at         TIMESTAMPTZ,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_portfolio ON journal_entry(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entry(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_reference ON journal_entry(reference_type, reference_id);

-- Líneas de asientos contables
CREATE TABLE IF NOT EXISTS journal_line (
  line_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id        UUID NOT NULL REFERENCES journal_entry(journal_id) ON DELETE CASCADE,
  account_id        UUID NOT NULL REFERENCES account(account_id) ON DELETE RESTRICT,
  property_id       UUID REFERENCES property(property_id) ON DELETE SET NULL,
  
  -- Monto y tipo
  amount_usd        NUMERIC(14,2) NOT NULL CHECK (amount_usd != 0),
  dr_cr             dr_cr NOT NULL,
  
  -- Metadata
  memo              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_line_journal ON journal_line(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_line_account ON journal_line(account_id);
CREATE INDEX IF NOT EXISTS idx_journal_line_property ON journal_line(property_id);

-- =====================================================================
-- 8. TABLA DE AUDITORÍA
-- =====================================================================

CREATE TABLE IF NOT EXISTS rent_audit_log (
  audit_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Qué cambió
  table_name        TEXT NOT NULL,
  record_id         UUID NOT NULL,
  operation         TEXT NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
  
  -- Datos del cambio
  old_data          JSONB,
  new_data          JSONB,
  changed_fields    TEXT[],
  
  -- Quién y cuándo
  changed_by        UUID,
  changed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Contexto
  ip_address        INET,
  user_agent        TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON rent_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON rent_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON rent_audit_log(changed_at);

-- =====================================================================
-- 9. FUNCIONES AUXILIARES
-- =====================================================================

-- Función para generar número de factura
CREATE OR REPLACE FUNCTION generate_invoice_number(p_lease_id UUID, p_year INT, p_month INT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  lease_num TEXT;
BEGIN
  SELECT lease_number INTO lease_num FROM lease WHERE lease_id = p_lease_id;
  RETURN format('INV-%s-%s%02d', COALESCE(lease_num, p_lease_id::TEXT), p_year, p_month);
END;
$$;

-- Función para generar número de pago
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN format('PAY-%s-%s', 
    to_char(now(), 'YYYYMMDD'),
    substring(gen_random_uuid()::TEXT, 1, 8)
  );
END;
$$;

-- Función para calcular balance de factura
CREATE OR REPLACE FUNCTION calculate_invoice_balance(p_invoice_id UUID)
RETURNS NUMERIC(12,2)
LANGUAGE plpgsql
AS $$
DECLARE
  balance NUMERIC(12,2);
BEGIN
  SELECT (amount_due - amount_paid) INTO balance
  FROM rent_invoice
  WHERE invoice_id = p_invoice_id;
  
  RETURN COALESCE(balance, 0);
END;
$$;

-- Función para generar número de lease
CREATE OR REPLACE FUNCTION generate_lease_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_part TEXT;
  seq_val BIGINT;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YY');
  seq_val := nextval('lease_number_seq');
  RETURN 'LSE-' || year_part || '-' || lpad(seq_val::TEXT, 5, '0');
END;
$$;

-- Trigger para asignar lease_number automáticamente
CREATE OR REPLACE FUNCTION set_lease_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lease_number IS NULL OR NEW.lease_number = '' THEN
    NEW.lease_number := generate_lease_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 10. FUNCIÓN: GENERAR FACTURAS MENSUALES
-- =====================================================================

CREATE OR REPLACE FUNCTION gen_rent_invoices(p_as_of DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  created_count INT,
  skipped_count INT,
  total_amount NUMERIC(12,2)
) 
LANGUAGE plpgsql
AS $$
DECLARE
  created INT := 0;
  skipped INT := 0;
  total NUMERIC(12,2) := 0;
  y INT := EXTRACT(YEAR FROM p_as_of);
  m INT := EXTRACT(MONTH FROM p_as_of);
  l RECORD;
  due DATE;
  inv_num TEXT;
BEGIN
  -- Iterar sobre leases activos
  FOR l IN
    SELECT *
    FROM lease
    WHERE status = 'active'
      AND start_date <= p_as_of
      AND (end_date IS NULL OR end_date >= p_as_of)
      AND auto_generate_invoices = TRUE
  LOOP
    -- Calcular fecha de vencimiento
    due := make_date(y, m, LEAST(l.rent_due_day, 
      EXTRACT(DAY FROM (make_date(y, m, 1) + INTERVAL '1 month - 1 day')::DATE)::INT
    ));
    
    -- Generar número de factura
    inv_num := generate_invoice_number(l.lease_id, y, m);
    
    -- Insertar factura si no existe
    BEGIN
      INSERT INTO rent_invoice(
        lease_id, 
        period_year, 
        period_month, 
        invoice_number,
        issue_date,
        due_date, 
        base_amount,
        amount_due, 
        notes
      )
      VALUES (
        l.lease_id, 
        y, 
        m, 
        inv_num,
        p_as_of,
        due, 
        l.monthly_rent,
        l.monthly_rent, 
        format('Monthly rent for %s/%s', m, y)
      );
      
      created := created + 1;
      total := total + l.monthly_rent;
      
    EXCEPTION WHEN unique_violation THEN
      skipped := skipped + 1;
    END;
  END LOOP;
  
  RETURN QUERY SELECT created, skipped, total;
END;
$$;

-- =====================================================================
-- 11. FUNCIÓN: APLICAR LATE FEES AUTOMÁTICOS
-- =====================================================================

CREATE OR REPLACE FUNCTION apply_late_fees(p_today DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  applied_count INT,
  total_fees NUMERIC(12,2)
) 
LANGUAGE plpgsql
AS $$
DECLARE
  applied INT := 0;
  total NUMERIC(12,2) := 0;
  inv RECORD;
  pol RECORD;
  fee NUMERIC(12,2);
  days_late INT;
  existing_fees INT;
BEGIN
  -- Iterar sobre facturas vencidas
  FOR inv IN
    SELECT i.*, l.lease_id, l.monthly_rent
    FROM rent_invoice i
    JOIN lease l ON l.lease_id = i.lease_id
    WHERE i.status IN ('pending', 'partial', 'late')
      AND i.due_date < p_today
      AND (i.amount_due - i.amount_paid) > 0
  LOOP
    -- Buscar política de late fee (primero por lease, luego por portfolio)
    SELECT * INTO pol 
    FROM late_fee_policy 
    WHERE (lease_id = inv.lease_id OR portfolio_id IN (
      SELECT portfolio_id FROM lease WHERE lease_id = inv.lease_id
    ))
    AND is_active = TRUE
    ORDER BY lease_id NULLS LAST
    LIMIT 1;

    IF pol IS NULL THEN 
      CONTINUE; 
    END IF;

    -- Calcular días de retraso (después del grace period)
    days_late := GREATEST((p_today - (inv.due_date + pol.grace_days)), 0);
    
    IF days_late <= 0 THEN 
      CONTINUE; 
    END IF;

    -- Verificar si ya se aplicaron late fees este mes
    SELECT COUNT(*) INTO existing_fees
    FROM rent_invoice_adjustment
    WHERE invoice_id = inv.invoice_id
      AND kind = 'late_fee'
      AND applied_date >= date_trunc('month', p_today)::DATE;

    -- Verificar límite de aplicaciones
    IF pol.max_applications IS NOT NULL AND existing_fees >= pol.max_applications THEN
      CONTINUE;
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
        -- Fee fijo + fee diario
        fee := COALESCE(pol.fixed_amount, 0) + 
               (COALESCE(pol.daily_amount, 0) * days_late);
    END CASE;

    -- Aplicar tope si existe
    IF pol.max_cap IS NOT NULL THEN
      fee := LEAST(fee, pol.max_cap);
    END IF;

    -- Evitar fees de $0
    IF fee <= 0 THEN
      CONTINUE;
    END IF;

    -- Insertar ajuste de late fee
    INSERT INTO rent_invoice_adjustment (
      invoice_id, 
      kind, 
      amount_delta, 
      reason,
      applied_date
    )
    VALUES (
      inv.invoice_id, 
      'late_fee', 
      fee, 
      format('Late fee: %s days overdue (grace: %s days)', days_late, pol.grace_days),
      p_today
    );

    -- Actualizar factura
    UPDATE rent_invoice
    SET 
      adjustments_total = adjustments_total + fee,
      amount_due = amount_due + fee,
      status = CASE 
        WHEN amount_paid >= (amount_due + fee) THEN 'paid'::invoice_status
        WHEN amount_paid > 0 THEN 'partial'::invoice_status
        ELSE 'late'::invoice_status
      END
    WHERE invoice_id = inv.invoice_id;

    applied := applied + 1;
    total := total + fee;
  END LOOP;

  RETURN QUERY SELECT applied, total;
END;
$$;

-- =====================================================================
-- 12. FUNCIÓN: APLICAR PAGO A FACTURAS (FIFO)
-- =====================================================================

CREATE OR REPLACE FUNCTION apply_payment_to_invoices(p_payment_id UUID)
RETURNS TABLE(
  invoices_affected INT,
  amount_applied NUMERIC(12,2)
) 
LANGUAGE plpgsql
AS $$
DECLARE
  p RECORD;
  inv RECORD;
  amt NUMERIC(12,2);
  missing NUMERIC(12,2);
  to_apply NUMERIC(12,2);
  affected INT := 0;
  applied NUMERIC(12,2) := 0;
BEGIN
  -- Obtener información del pago
  SELECT * INTO p 
  FROM payment_transaction 
  WHERE payment_id = p_payment_id;

  IF p IS NULL THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  IF p.status != 'succeeded' THEN
    RAISE NOTICE 'Payment % status is %, not succeeded', p_payment_id, p.status;
    RETURN QUERY SELECT 0, 0::NUMERIC(12,2);
    RETURN;
  END IF;

  amt := p.amount_usd;

  -- Aplicar a facturas pendientes (FIFO por período)
  FOR inv IN
    SELECT *
    FROM rent_invoice
    WHERE lease_id = p.lease_id 
      AND status IN ('pending', 'partial', 'late')
      AND (amount_due - amount_paid) > 0
    ORDER BY period_year, period_month, due_date
  LOOP
    EXIT WHEN amt <= 0;

    -- Calcular faltante en esta factura
    missing := (inv.amount_due - inv.amount_paid);
    
    IF missing <= 0 THEN 
      CONTINUE; 
    END IF;

    -- Determinar cuánto aplicar
    to_apply := LEAST(amt, missing);

    -- Actualizar factura
    UPDATE rent_invoice
    SET 
      amount_paid = amount_paid + to_apply,
      status = CASE 
        WHEN (amount_paid + to_apply) >= amount_due THEN 'paid'::invoice_status
        ELSE 'partial'::invoice_status
      END,
      paid_date = CASE 
        WHEN (amount_paid + to_apply) >= amount_due THEN CURRENT_DATE
        ELSE paid_date
      END
    WHERE invoice_id = inv.invoice_id;

    -- Actualizar contadores
    amt := amt - to_apply;
    applied := applied + to_apply;
    affected := affected + 1;

    -- Vincular pago a factura si no está vinculado
    IF p.invoice_id IS NULL AND affected = 1 THEN
      UPDATE payment_transaction
      SET invoice_id = inv.invoice_id
      WHERE payment_id = p_payment_id;
    END IF;
  END LOOP;

  RETURN QUERY SELECT affected, applied;
END;
$$;

-- =====================================================================
-- 13. FUNCIÓN: CREAR ASIENTO CONTABLE POR PAGO
-- =====================================================================

CREATE OR REPLACE FUNCTION create_payment_journal_entry(p_payment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  p RECORD;
  l RECORD;
  j_id UUID;
  cash_acct UUID;
  rent_acct UUID;
  fee_acct UUID;
BEGIN
  -- Obtener pago
  SELECT * INTO p FROM payment_transaction WHERE payment_id = p_payment_id;
  IF p IS NULL THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  -- Obtener lease
  SELECT * INTO l FROM lease WHERE lease_id = p.lease_id;
  IF l IS NULL THEN
    RAISE EXCEPTION 'Lease % not found', p.lease_id;
  END IF;

  -- Buscar cuentas contables
  SELECT account_id INTO cash_acct 
  FROM account 
  WHERE type = 'asset' AND code = 'CASH' 
    AND (portfolio_id = l.portfolio_id OR portfolio_id IS NULL)
  LIMIT 1;

  SELECT account_id INTO rent_acct 
  FROM account 
  WHERE type = 'income' AND code = 'RENT' 
    AND (portfolio_id = l.portfolio_id OR portfolio_id IS NULL)
  LIMIT 1;

  SELECT account_id INTO fee_acct 
  FROM account 
  WHERE type = 'expense' AND code = 'PROCESSING_FEE' 
    AND (portfolio_id = l.portfolio_id OR portfolio_id IS NULL)
  LIMIT 1;

  -- Si no existen las cuentas, no crear asiento
  IF cash_acct IS NULL OR rent_acct IS NULL THEN
    RAISE NOTICE 'Required accounts not found, skipping journal entry';
    RETURN NULL;
  END IF;

  -- Crear asiento contable
  INSERT INTO journal_entry (
    portfolio_id, 
    entry_date, 
    memo,
    reference_type,
    reference_id
  )
  VALUES (
    l.portfolio_id,
    COALESCE(p.received_at::DATE, CURRENT_DATE),
    format('Rent payment %s - %s', p.payment_number, p.method),
    'payment',
    p_payment_id
  )
  RETURNING journal_id INTO j_id;

  -- DR: Cash (monto neto después de fees)
  INSERT INTO journal_line (journal_id, account_id, property_id, amount_usd, dr_cr, memo)
  VALUES (
    j_id,
    cash_acct,
    l.property_id,
    p.net_amount,
    'DR',
    'Cash received'
  );

  -- DR: Processing Fee (si existe)
  IF p.fee_usd > 0 AND fee_acct IS NOT NULL THEN
    INSERT INTO journal_line (journal_id, account_id, property_id, amount_usd, dr_cr, memo)
    VALUES (
      j_id,
      fee_acct,
      l.property_id,
      p.fee_usd,
      'DR',
      'Payment processing fee'
    );
  END IF;

  -- CR: Rent Income
  INSERT INTO journal_line (journal_id, account_id, property_id, amount_usd, dr_cr, memo)
  VALUES (
    j_id,
    rent_acct,
    l.property_id,
    p.amount_usd,
    'CR',
    'Rent income'
  );

  -- Marcar asiento como posteado
  UPDATE journal_entry
  SET is_posted = TRUE, posted_at = now()
  WHERE journal_id = j_id;

  RETURN j_id;
END;
$$;

-- =====================================================================
-- 14. TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA DE ESTADOS
-- =====================================================================

-- Crear secuencia para lease_number si no existe
CREATE SEQUENCE IF NOT EXISTS lease_number_seq;

-- Crear el trigger para lease_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_lease_number'
  ) THEN
    CREATE TRIGGER trg_set_lease_number
      BEFORE INSERT ON lease
      FOR EACH ROW EXECUTE FUNCTION set_lease_number();
  END IF;
END $$;

-- Trigger para recalcular amount_due cuando se agregan adjustments
CREATE OR REPLACE FUNCTION recalculate_invoice_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rent_invoice
  SET 
    adjustments_total = (
      SELECT COALESCE(SUM(amount_delta), 0)
      FROM rent_invoice_adjustment
      WHERE invoice_id = NEW.invoice_id
    ),
    amount_due = base_amount + (
      SELECT COALESCE(SUM(amount_delta), 0)
      FROM rent_invoice_adjustment
      WHERE invoice_id = NEW.invoice_id
    )
  WHERE invoice_id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_adjustment_recalc
  AFTER INSERT OR UPDATE ON rent_invoice_adjustment
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_invoice_amount();

-- Trigger para actualizar el estado de la propiedad cuando cambia un lease
CREATE OR REPLACE FUNCTION update_property_status_on_lease_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Esta función es un placeholder. La lógica real está en la vista.
  -- Podríamos usarla para actualizar un campo 'status' en la tabla 'property' si fuera necesario.
  RETURN NULL; -- No hace nada por ahora, pero el trigger existe.
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_property_status
  AFTER INSERT OR UPDATE OR DELETE ON lease
  FOR EACH ROW
  EXECUTE FUNCTION update_property_status_on_lease_change();

-- =====================================================================
-- 15. VISTAS ÚTILES
-- =====================================================================

-- Vista de facturas con información del lease y tenant
CREATE OR REPLACE VIEW v_rent_invoice_detail AS
SELECT 
  i.*,
  l.lease_number,
  l.property_id,
  l.tenant_person_id,
  p.full_name AS tenant_name,
  p.primary_email AS tenant_email,
  pr.address AS property_address,
  (i.amount_due - i.amount_paid) AS balance,
  CASE 
    WHEN i.status = 'paid' THEN 0
    WHEN i.due_date < CURRENT_DATE THEN CURRENT_DATE - i.due_date
    ELSE 0
  END AS days_overdue
FROM rent_invoice i
JOIN lease l ON l.lease_id = i.lease_id
JOIN person p ON p.person_id = l.tenant_person_id
JOIN property pr ON pr.property_id = l.property_id;

-- Vista de pagos con información del lease
CREATE OR REPLACE VIEW v_payment_detail AS
SELECT 
  pt.*,
  l.lease_number,
  l.property_id,
  l.tenant_person_id,
  p.full_name AS tenant_name,
  i.invoice_number,
  i.period_year,
  i.period_month
FROM payment_transaction pt
JOIN lease l ON l.lease_id = pt.lease_id
JOIN person p ON p.person_id = l.tenant_person_id
LEFT JOIN rent_invoice i ON i.invoice_id = pt.invoice_id;

-- Vista de propiedades con estado de ocupación
CREATE OR REPLACE VIEW v_property_with_occupancy AS
SELECT
  p.*,
  CASE
    WHEN l.lease_id IS NOT NULL THEN 'rented'::text
    ELSE 'available'::text
  END AS occupancy_status,
  l.lease_id,
  l.tenant_person_id,
  t.full_name AS tenant_name
FROM property p
LEFT JOIN lease l ON p.property_id = l.property_id AND l.status = 'active'
LEFT JOIN person t ON l.tenant_person_id = t.person_id;


-- Vista de balance por lease
CREATE OR REPLACE VIEW v_lease_balance AS
SELECT 
  l.lease_id,
  l.lease_number,
  l.property_id,
  l.tenant_person_id,
  p.full_name AS tenant_name,
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
GROUP BY l.lease_id, l.lease_number, l.property_id, l.tenant_person_id, p.full_name;

-- =====================================================================
-- 16. DATOS INICIALES (CUENTAS CONTABLES BÁSICAS)
-- =====================================================================

-- Insertar cuentas contables básicas si no existen
INSERT INTO account (code, name, type, is_active)
VALUES 
  ('CASH', 'Cash', 'asset', TRUE),
  ('RENT', 'Rent Income', 'income', TRUE),
  ('LATE_FEE', 'Late Fee Income', 'income', TRUE),
  ('PROCESSING_FEE', 'Payment Processing Fees', 'expense', TRUE),
  ('SECURITY_DEPOSIT', 'Security Deposits Held', 'liability', TRUE)
ON CONFLICT (portfolio_id, code) DO NOTHING;

-- =====================================================================
-- 17. COMENTARIOS EN TABLAS
-- =====================================================================

COMMENT ON TABLE lease IS 'Contratos de arrendamiento entre propietarios y tenants';
COMMENT ON TABLE rent_invoice IS 'Facturas mensuales de renta generadas automáticamente';
COMMENT ON TABLE rent_invoice_adjustment IS 'Ajustes a facturas: late fees, descuentos, créditos';
COMMENT ON TABLE late_fee_policy IS 'Políticas de late fees por lease o portfolio';
COMMENT ON TABLE payment_transaction IS 'Transacciones de pago de rentas';
COMMENT ON TABLE account IS 'Catálogo de cuentas contables';
COMMENT ON TABLE journal_entry IS 'Asientos contables (journal entries)';
COMMENT ON TABLE journal_line IS 'Líneas de asientos contables (débitos y créditos)';

-- =====================================================================
-- 18. FUNCIONES PARA GESTIÓN MANUAL
-- =====================================================================

-- Función para aplicar late fees manualmente a una factura
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
  SELECT * INTO inv FROM rent_invoice WHERE invoice_id = p_invoice_id;
  
  IF inv IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 'Factura no encontrada';
    RETURN;
  END IF;
  
  IF inv.status = 'paid' THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 'Factura ya está pagada';
    RETURN;
  END IF;
  
  SELECT * INTO pol FROM late_fee_policy 
  WHERE lease_id = inv.lease_id AND is_active = TRUE;
  
  IF pol IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 'No hay política de late fees configurada';
    RETURN;
  END IF;
  
  days_late := GREATEST((p_today - (inv.due_date + pol.grace_days)), 0);
  
  IF days_late <= 0 THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 
      format('Aún en período de gracia (%s días)', pol.grace_days);
    RETURN;
  END IF;
  
  SELECT COUNT(*) INTO existing_fees
  FROM rent_invoice_adjustment
  WHERE invoice_id = p_invoice_id AND kind = 'late_fee';
  
  IF pol.max_applications IS NOT NULL AND existing_fees >= pol.max_applications THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 
      format('Límite de late fees alcanzado (%s aplicaciones)', pol.max_applications);
    RETURN;
  END IF;
  
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
  
  IF pol.max_cap IS NOT NULL THEN
    fee := LEAST(fee, pol.max_cap);
  END IF;
  
  IF fee <= 0 THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC(12,2), 'Fee calculado es $0';
    RETURN;
  END IF;
  
  INSERT INTO rent_invoice_adjustment (invoice_id, kind, amount_delta, reason)
  VALUES (p_invoice_id, 'late_fee', fee, format('Late fee: %s días de retraso (gracia: %s días)', days_late, pol.grace_days));
  
  RETURN QUERY SELECT TRUE, fee, format('Late fee de $%s aplicado exitosamente', fee);
END;
$$;

COMMENT ON FUNCTION apply_late_fees_manual IS 'Aplica late fee a una factura específica de forma manual';

-- Función para registrar un pago manual
CREATE OR REPLACE FUNCTION register_payment_manual(
  p_lease_id UUID,
  p_amount NUMERIC(12,2),
  p_method payment_method,
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
  affected INT;
  applied NUMERIC(12,2);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lease WHERE lease_id = p_lease_id) THEN
    RAISE EXCEPTION 'Lease % no encontrado', p_lease_id;
  END IF;
  
  payment_num := generate_payment_number();
  
  INSERT INTO payment_transaction (
    lease_id, payment_number, method, amount_usd, fee_usd, status, received_at, payer_name
  ) VALUES (
    p_lease_id, payment_num, p_method, p_amount, 0, 'succeeded', p_received_date::TIMESTAMPTZ, p_payer_name
  )
  RETURNING payment_transaction.payment_id INTO new_payment_id;
  
  SELECT * INTO affected, applied FROM apply_payment_to_invoices(new_payment_id);
  
  RETURN QUERY SELECT 
    new_payment_id,
    affected,
    applied,
    format('Pago de $%s registrado. %s factura(s) afectada(s)', p_amount, affected);
END;
$$;

COMMENT ON FUNCTION register_payment_manual IS 'Registra un pago manual y lo aplica automáticamente a facturas pendientes (FIFO)';

-- Función para crear una factura manual
CREATE OR REPLACE FUNCTION create_invoice_manual(
  p_lease_id UUID,
  p_year INT,
  p_month INT,
  p_amount NUMERIC(12,2) DEFAULT NULL,
  p_due_date DATE DEFAULT NULL
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
  SELECT * INTO l FROM lease WHERE lease_id = p_lease_id;
  
  IF l IS NULL THEN
    RAISE EXCEPTION 'Lease % no encontrado', p_lease_id;
  END IF;
  
  inv_amount := COALESCE(p_amount, l.monthly_rent);
  
  inv_due_date := COALESCE(p_due_date, make_date(p_year, p_month, 
    LEAST(l.rent_due_day, EXTRACT(DAY FROM (make_date(p_year, p_month, 1) + INTERVAL '1 month - 1 day')::DATE)::INT)
  ));
  
  inv_number := generate_invoice_number(p_lease_id, p_year, p_month);
  
  INSERT INTO rent_invoice (
    lease_id, period_year, period_month, invoice_number, base_amount, amount_due, due_date
  ) VALUES (
    p_lease_id, p_year, p_month, inv_number, inv_amount, inv_amount, inv_due_date
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

COMMENT ON FUNCTION create_invoice_manual IS 'Crea una factura manual para un lease específico';

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================