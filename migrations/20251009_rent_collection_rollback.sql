-- =====================================================================
-- RENT COLLECTION SYSTEM - ROLLBACK SCRIPT
-- =====================================================================
-- Author: Kilo Code
-- Date: 2025-10-09
-- Description: Script para deshacer el sistema de cobro de alquiler
-- =====================================================================

SET search_path = public;

-- =====================================================================
-- ADVERTENCIA: Este script eliminará TODAS las tablas y datos del
-- sistema de cobro de alquiler. Úsalo solo si necesitas hacer rollback.
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '⚠️  INICIANDO ROLLBACK DEL SISTEMA DE COBRO...';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- 1. ELIMINAR VISTAS
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '🗑️  Eliminando vistas...';
END $$;

DROP VIEW IF EXISTS v_lease_balance CASCADE;
DROP VIEW IF EXISTS v_payment_detail CASCADE;
DROP VIEW IF EXISTS v_rent_invoice_detail CASCADE;

-- =====================================================================
-- 2. ELIMINAR TRIGGERS
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '🗑️  Eliminando triggers...';
END $$;

DROP TRIGGER IF EXISTS trg_adjustment_recalc ON rent_invoice_adjustment;
DROP TRIGGER IF EXISTS trg_payment_updated ON payment_transaction;
DROP TRIGGER IF EXISTS trg_invoice_updated ON rent_invoice;
DROP TRIGGER IF EXISTS trg_lease_updated ON lease;

-- =====================================================================
-- 3. ELIMINAR FUNCIONES
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '🗑️  Eliminando funciones...';
END $$;

DROP FUNCTION IF EXISTS recalculate_invoice_amount() CASCADE;
DROP FUNCTION IF EXISTS create_payment_journal_entry(UUID) CASCADE;
DROP FUNCTION IF EXISTS apply_payment_to_invoices(UUID) CASCADE;
DROP FUNCTION IF EXISTS apply_late_fees(DATE) CASCADE;
DROP FUNCTION IF EXISTS gen_rent_invoices(DATE) CASCADE;
DROP FUNCTION IF EXISTS calculate_invoice_balance(UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_payment_number() CASCADE;
DROP FUNCTION IF EXISTS generate_invoice_number(UUID, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS update_lease_timestamp() CASCADE;

-- =====================================================================
-- 4. ELIMINAR TABLAS (en orden inverso de dependencias)
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '🗑️  Eliminando tablas...';
END $$;

DROP TABLE IF EXISTS rent_audit_log CASCADE;
DROP TABLE IF EXISTS journal_line CASCADE;
DROP TABLE IF EXISTS journal_entry CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS payment_transaction CASCADE;
DROP TABLE IF EXISTS rent_invoice_adjustment CASCADE;
DROP TABLE IF EXISTS late_fee_policy CASCADE;
DROP TABLE IF EXISTS rent_invoice CASCADE;
DROP TABLE IF EXISTS lease CASCADE;

-- =====================================================================
-- 5. ELIMINAR ENUMS
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '🗑️  Eliminando tipos enum...';
END $$;

DROP TYPE IF EXISTS dr_cr CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;
DROP TYPE IF EXISTS late_fee_mode CASCADE;
DROP TYPE IF EXISTS adjustment_kind CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS lease_status CASCADE;

-- =====================================================================
-- 6. LIMPIAR DATOS DE PRUEBA (OPCIONAL)
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '🗑️  Limpiando datos de prueba...';
END $$;

-- Eliminar propiedades ficticias
DELETE FROM property WHERE property_id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-1111-1111-1111-111111111111'
);

-- Eliminar inquilinos ficticios
DELETE FROM person WHERE person_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- Eliminar portfolio de prueba
DELETE FROM portfolio WHERE portfolio_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

-- =====================================================================
-- 7. VERIFICACIÓN
-- =====================================================================

DO $$
DECLARE
  table_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ROLLBACK COMPLETADO';
  RAISE NOTICE '';
  
  -- Verificar que las tablas fueron eliminadas
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'lease', 'rent_invoice', 'rent_invoice_adjustment',
      'late_fee_policy', 'payment_transaction', 'account',
      'journal_entry', 'journal_line', 'rent_audit_log'
    );
  
  IF table_count = 0 THEN
    RAISE NOTICE '✓ Todas las tablas del sistema de cobro fueron eliminadas';
  ELSE
    RAISE NOTICE '⚠️  Algunas tablas aún existen (% tablas)', table_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Para reinstalar el sistema, ejecuta:';
  RAISE NOTICE '  psql -d owneriq -f migrations/20251009_rent_collection_system.sql';
  RAISE NOTICE '';
END $$;

-- =====================================================================
-- FIN DEL ROLLBACK
-- =====================================================================