-- =====================================================================
-- LIMPIEZA DE SCHEMA NO UTILIZADO - OwnerIQ
-- =====================================================================
-- Este script elimina tablas, vistas, funciones, triggers y tipos
-- que NO están siendo utilizados en el código actual.
--
-- IMPORTANTE:
-- - Hacer backup de la base de datos antes de ejecutar
-- - Revisar cuidadosamente antes de aplicar en producción
-- - Las tablas se eliminan en orden para respetar foreign keys
-- =====================================================================

BEGIN;

-- =====================================================================
-- PASO 1: ELIMINAR VISTAS NO UTILIZADAS
-- =====================================================================

DROP VIEW IF EXISTS v_person_active_buy_box CASCADE;
DROP VIEW IF EXISTS v_last_recommendation CASCADE;

-- =====================================================================
-- PASO 2: ELIMINAR TABLAS NO UTILIZADAS (en orden de dependencias)
-- =====================================================================

-- Tablas de Investment & Buy Box (NO USADAS)
DROP TABLE IF EXISTS buy_box_property_type CASCADE;
DROP TABLE IF EXISTS buy_box_market CASCADE;
DROP TABLE IF EXISTS buy_box CASCADE;
DROP TABLE IF EXISTS funding_profile CASCADE;
DROP TABLE IF EXISTS investor_profile CASCADE;

-- Tablas de Watchlist & Saved Searches (NO USADAS)
DROP TABLE IF EXISTS watchlist_item CASCADE;
DROP TABLE IF EXISTS watchlist CASCADE;
DROP TABLE IF EXISTS saved_search CASCADE;

-- Tablas de Recommendations & DealScore (NO USADAS)
DROP TABLE IF EXISTS recommendation_log CASCADE;
DROP TABLE IF EXISTS property_dealscore CASCADE;
DROP TABLE IF EXISTS dealscore_rule_set CASCADE;

-- Tablas de Property Analytics Duplicadas (NO USADAS - data está en property)
DROP TABLE IF EXISTS property_loan CASCADE;
DROP TABLE IF EXISTS property_operating_inputs CASCADE;
DROP TABLE IF EXISTS property_rent_estimate CASCADE;
DROP TABLE IF EXISTS property_valuation CASCADE;

-- Tablas de Market Data (NO USADAS)
DROP TABLE IF EXISTS market_stats CASCADE;

-- Tablas de Portfolio (NO USADAS actualmente)
DROP TABLE IF EXISTS portfolio_member CASCADE;
DROP TABLE IF EXISTS portfolio CASCADE;

-- Tablas de Consents (NO USADAS)
DROP TABLE IF EXISTS consent_event CASCADE;

-- Tabla de Region (NO USADA)
DROP TABLE IF EXISTS region CASCADE;

-- =====================================================================
-- PASO 3: ELIMINAR TIPOS/ENUMS NO UTILIZADOS
-- =====================================================================

-- Enums relacionados con tablas eliminadas
DROP TYPE IF EXISTS kyc_status CASCADE;
DROP TYPE IF EXISTS accreditation CASCADE;
DROP TYPE IF EXISTS risk_tolerance CASCADE;
DROP TYPE IF EXISTS invest_strategy CASCADE;
DROP TYPE IF EXISTS portfolio_role CASCADE;
DROP TYPE IF EXISTS consent_kind CASCADE;
DROP TYPE IF EXISTS decision_kind CASCADE;

-- =====================================================================
-- PASO 4: INFORMACIÓN DE CONFIRMACIÓN
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'LIMPIEZA COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLAS ELIMINADAS (20):';
  RAISE NOTICE '  - buy_box_property_type';
  RAISE NOTICE '  - buy_box_market';
  RAISE NOTICE '  - buy_box';
  RAISE NOTICE '  - funding_profile';
  RAISE NOTICE '  - investor_profile';
  RAISE NOTICE '  - watchlist_item';
  RAISE NOTICE '  - watchlist';
  RAISE NOTICE '  - saved_search';
  RAISE NOTICE '  - recommendation_log';
  RAISE NOTICE '  - property_dealscore';
  RAISE NOTICE '  - dealscore_rule_set';
  RAISE NOTICE '  - property_loan';
  RAISE NOTICE '  - property_operating_inputs';
  RAISE NOTICE '  - property_rent_estimate';
  RAISE NOTICE '  - property_valuation';
  RAISE NOTICE '  - market_stats';
  RAISE NOTICE '  - portfolio_member';
  RAISE NOTICE '  - portfolio';
  RAISE NOTICE '  - consent_event';
  RAISE NOTICE '  - region';
  RAISE NOTICE '';
  RAISE NOTICE 'VISTAS ELIMINADAS (2):';
  RAISE NOTICE '  - v_person_active_buy_box';
  RAISE NOTICE '  - v_last_recommendation';
  RAISE NOTICE '';
  RAISE NOTICE 'TIPOS/ENUMS ELIMINADOS (8):';
  RAISE NOTICE '  - kyc_status';
  RAISE NOTICE '  - accreditation';
  RAISE NOTICE '  - risk_tolerance';
  RAISE NOTICE '  - invest_strategy';
  RAISE NOTICE '  - portfolio_role';
  RAISE NOTICE '  - consent_kind';
  RAISE NOTICE '  - decision_kind';
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'TABLAS QUE SE MANTIENEN (ACTIVAMENTE USADAS):';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CORE TABLES:';
  RAISE NOTICE '  ✓ person (usuarios, tenants, lenders)';
  RAISE NOTICE '  ✓ person_role (roles de personas)';
  RAISE NOTICE '  ✓ person_contact (emails, teléfonos)';
  RAISE NOTICE '  ✓ person_address (direcciones)';
  RAISE NOTICE '  ✓ person_document (documentos de personas)';
  RAISE NOTICE '';
  RAISE NOTICE 'PROPERTY MANAGEMENT:';
  RAISE NOTICE '  ✓ property (propiedades con todos los datos financieros)';
  RAISE NOTICE '  ✓ property_document (documentos de propiedades)';
  RAISE NOTICE '  ✓ property_metrics (métricas calculadas)';
  RAISE NOTICE '';
  RAISE NOTICE 'TENANCY & LEASES:';
  RAISE NOTICE '  ✓ property_tenancy (relación tenant-property)';
  RAISE NOTICE '  ✓ property_tenancy_party (co-tenants)';
  RAISE NOTICE '  ✓ lease (contratos formales)';
  RAISE NOTICE '';
  RAISE NOTICE 'RENT COLLECTION:';
  RAISE NOTICE '  ✓ rent_invoice (facturas de renta)';
  RAISE NOTICE '  ✓ rent_invoice_adjustment (late fees, descuentos)';
  RAISE NOTICE '  ✓ payment_transaction (pagos)';
  RAISE NOTICE '  ✓ late_fee_policy (políticas de late fees)';
  RAISE NOTICE '';
  RAISE NOTICE 'ACCOUNTING:';
  RAISE NOTICE '  ✓ account (catálogo de cuentas)';
  RAISE NOTICE '  ✓ journal_entry (asientos contables)';
  RAISE NOTICE '  ✓ journal_line (líneas de asientos)';
  RAISE NOTICE '';
  RAISE NOTICE 'MORTGAGE TRACKING:';
  RAISE NOTICE '  ✓ mortgage_summary (resumen de hipoteca)';
  RAISE NOTICE '  ✓ mortgage_payment_schedule (tabla de amortización)';
  RAISE NOTICE '';
  RAISE NOTICE 'AUDIT & LOGS:';
  RAISE NOTICE '  ✓ rent_audit_log (auditoría de cambios)';
  RAISE NOTICE '';
  RAISE NOTICE 'AI DOCUMENT PIPELINE:';
  RAISE NOTICE '  ✓ documents (documentos procesados por IA)';
  RAISE NOTICE '  ✓ document_pages (páginas de documentos)';
  RAISE NOTICE '  ✓ extracted_fields (campos extraídos)';
  RAISE NOTICE '  ✓ document_validations (validaciones)';
  RAISE NOTICE '  ✓ processing_logs (logs de procesamiento)';
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
END $$;

COMMIT;

-- =====================================================================
-- VERIFICACIÓN POST-LIMPIEZA
-- =====================================================================

-- Comando para verificar las tablas restantes
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;
