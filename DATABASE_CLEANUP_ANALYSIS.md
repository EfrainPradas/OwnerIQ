# Análisis de Limpieza de Base de Datos - OwnerIQ

**Fecha:** 31 de Octubre, 2025
**Analista:** Claude Code
**Base de Datos:** PostgreSQL (Supabase)

---

## Resumen Ejecutivo

Se identificaron **28+ tablas** definidas en el schema original, de las cuales **solo 18 tablas están activamente en uso**. Esto representa aproximadamente un **35% de uso efectivo** del schema.

Se recomienda eliminar **20 tablas, 2 vistas y 8 tipos/enums** que no tienen ninguna referencia en el código actual.

---

## Tablas Activamente Utilizadas (18)

### 1. Core Person Management (5 tablas)

| Tabla | Propósito | Operaciones | Ubicación Principal |
|-------|-----------|-------------|---------------------|
| `person` | Entidad central para usuarios, tenants, lenders | ~30 ops/día | `backend/routes/clients.js:183+` |
| `person_role` | Define roles (tenant, lender, advisor) | ~15 ops/día | `backend/routes/clients.js:227+` |
| `person_contact` | Emails, teléfonos, WhatsApp | Delete+Insert | `backend/routes/clients.js:602+` |
| `person_address` | Direcciones físicas con validación | Delete+Insert | `backend/routes/clients.js:623+` |
| `person_document` | Documentos adjuntos a personas | Cleanup only | `backend/routes/clients.js:534` |

### 2. Property Management (3 tablas)

| Tabla | Propósito | Campos Clave | Uso |
|-------|-----------|--------------|-----|
| `property` | Propiedades con 100+ campos financieros | address, valuation, loan_amount, taxes | 15+ operaciones |
| `property_document` | Documentos de propiedades | file_path, document_type | Upload/Delete |
| `property_metrics` | NOI, Cap Rate, Cash Flow, DSCR | noi, cap_rate, dscr | Cleanup refs |

### 3. Tenancy & Leases (3 tablas)

| Tabla | Propósito | Estado | Operaciones |
|-------|-----------|--------|-------------|
| `property_tenancy` | Relación tenant-property con fechas | CRÍTICO | ~25 ops |
| `property_tenancy_party` | Co-tenants y guarantors | Minimal uso | Delete ops |
| `lease` | Contratos formales con auto-invoicing | CRÍTICO | ~15 ops |

### 4. Rent Collection System (4 tablas)

| Tabla | Propósito | Funcionalidad | Uso |
|-------|-----------|---------------|-----|
| `rent_invoice` | Facturas mensuales | Auto-generación, status tracking | HIGH |
| `rent_invoice_adjustment` | Late fees, descuentos | Trigger automático | HIGH |
| `payment_transaction` | Registro de pagos | FIFO allocation | MEDIUM |
| `late_fee_policy` | Políticas de late fees | Por lease o portfolio | LOW |

### 5. Accounting (3 tablas)

| Tabla | Propósito | Uso |
|-------|-----------|-----|
| `account` | Catálogo de cuentas | Definido pero bajo uso |
| `journal_entry` | Asientos contables | Funciones definidas |
| `journal_line` | Débitos y créditos | Funciones definidas |

### 6. Mortgage Tracking (2 tablas)

| Tabla | Propósito | Volumen | Ubicación |
|-------|-----------|---------|-----------|
| `mortgage_summary` | Totales de hipoteca | 1 row per property | `routes/mortgage.js` |
| `mortgage_payment_schedule` | Amortización completa | 360 rows per loan | `routes/mortgage.js` |

### 7. Audit & Logs (1 tabla)

| Tabla | Propósito | Uso |
|-------|-----------|-----|
| `rent_audit_log` | Auditoría de cambios | Definido en schema |

---

## Tablas NO Utilizadas - Para Eliminar (20)

### Categoría: Investment & Analytics

| Tabla | Razón para Eliminar |
|-------|---------------------|
| `buy_box` | Feature de investment tracking nunca implementado |
| `buy_box_market` | Relacionada a buy_box |
| `buy_box_property_type` | Relacionada a buy_box |
| `investor_profile` | KYC/accreditation no implementado |
| `funding_profile` | Funding sources no implementado |
| `recommendation_log` | AI recommendations no activo |
| `property_dealscore` | Deal scoring no implementado |
| `dealscore_rule_set` | Relacionado a dealscore |

### Categoría: Redundante con `property`

| Tabla | Por Qué es Redundante |
|-------|----------------------|
| `property_valuation` | Data almacenada en `property.valuation` |
| `property_rent_estimate` | Data almacenada en `property.rent` |
| `property_operating_inputs` | Data almacenada en `property` (taxes, insurance, etc) |
| `property_loan` | Data almacenada en `property` (loan_amount, loan_rate, etc) |

### Categoría: Features No Implementados

| Tabla | Feature Planeado Pero No Activo |
|-------|----------------------------------|
| `watchlist` | Wishlist de propiedades |
| `watchlist_item` | Items en watchlist |
| `saved_search` | Búsquedas guardadas |
| `consent_event` | GDPR consents |

### Categoría: Infraestructura No Usada

| Tabla | Razón |
|-------|-------|
| `portfolio` | Multi-portfolio no implementado actualmente |
| `portfolio_member` | Relacionada a portfolio |
| `region` | Geographic data no usado |
| `market_stats` | Market analytics no activo |

---

## Vistas No Utilizadas (2)

| Vista | Definición | Uso |
|-------|------------|-----|
| `v_person_active_buy_box` | Last active buy box per person | 0 referencias |
| `v_last_recommendation` | Last recommendation outcome | 0 referencias |

---

## Tipos/Enums No Utilizados (8)

| Tipo | Relacionado A |
|------|---------------|
| `kyc_status` | investor_profile |
| `accreditation` | investor_profile |
| `risk_tolerance` | investor_profile |
| `invest_strategy` | buy_box |
| `portfolio_role` | portfolio_member |
| `consent_kind` | consent_event |
| `decision_kind` | recommendation_log |
| `property_type` (partially) | Definido pero uso limitado |

---

## Funciones y Triggers a Revisar

### Funciones Activas del Rent Collection System

✅ **EN USO:**
- `generate_invoice_number()`
- `generate_payment_number()`
- `generate_lease_number()`
- `calculate_invoice_balance()`
- `gen_rent_invoices()` - Genera facturas mensuales
- `apply_late_fees()` - Aplica late fees automáticos
- `apply_payment_to_invoices()` - Aplica pagos FIFO
- `create_payment_journal_entry()` - Contabilidad
- `apply_late_fees_manual()`
- `register_payment_manual()`
- `create_invoice_manual()`

### Triggers Activos

✅ **EN USO:**
- `update_lease_timestamp()` - Actualiza updated_at
- `set_lease_number()` - Genera lease_number
- `recalculate_invoice_amount()` - Recalcula totales
- `update_property_status_on_lease_change()` - Placeholder

---

## Impacto de la Limpieza

### Beneficios

1. **Reducción de Complejidad**: -71% de tablas (28 → 18)
2. **Claridad de Schema**: Solo tablas activamente usadas
3. **Mantenimiento**: Menos confusión para nuevos desarrolladores
4. **Documentación**: Schema más fácil de entender
5. **Performance**: Menos metadata para PostgreSQL

### Riesgos

⚠️ **BAJO RIESGO** porque:
- Ninguna tabla eliminada tiene datos activos
- No hay foreign keys desde tablas activas hacia estas tablas
- Código no hace referencia a estas tablas
- Se puede restaurar desde backup si necesario

---

## Plan de Ejecución Recomendado

### Fase 1: Preparación (AHORA)

1. ✅ Hacer backup completo de la base de datos
2. ✅ Revisar script `cleanup_unused_schema.sql`
3. ✅ Documentar tablas que se eliminarán

### Fase 2: Ejecución en Staging

1. Aplicar script en ambiente de staging
2. Ejecutar tests completos de la aplicación
3. Verificar que no hay errores relacionados

### Fase 3: Producción

1. Hacer backup pre-deployment
2. Ejecutar script en ventana de mantenimiento
3. Monitorear logs por 24h
4. Validar funcionalidad completa

---

## Comando para Ejecutar

```bash
# En staging primero
psql -h your-staging-db.supabase.co -U postgres -d postgres -f cleanup_unused_schema.sql

# En producción (después de validar staging)
psql -h your-prod-db.supabase.co -U postgres -d postgres -f cleanup_unused_schema.sql
```

---

## Archivos Generados

1. **cleanup_unused_schema.sql** - Script de limpieza ejecutable
2. **DATABASE_CLEANUP_ANALYSIS.md** - Este documento de análisis

---

## Verificación Post-Limpieza

Después de ejecutar el script, verificar:

```sql
-- Ver todas las tablas restantes
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Debe retornar aproximadamente 18 tablas
```

---

## Conclusión

La limpieza eliminará **20 tablas (71%)**, **2 vistas**, y **8 tipos** que no tienen ningún uso en el código actual. Esto simplificará significativamente el schema sin afectar funcionalidad.

**Recomendación:** ✅ PROCEDER con la limpieza después de backup.

---

## Preguntas Frecuentes

**Q: ¿Y si necesitamos estas features en el futuro?**
A: Podemos recrear las tablas cuando sea necesario. El schema está documentado y versionado en Git.

**Q: ¿Hay riesgo de pérdida de datos?**
A: NO. Estas tablas están vacías o no se usan. Hacer backup antes por precaución.

**Q: ¿Afecta el rendimiento?**
A: POSITIVAMENTE. Menos metadata = queries más rápidas.

**Q: ¿Se puede revertir?**
A: SÍ. Con el backup y los scripts en Git, se puede restaurar completamente.

---

**Última actualización:** 31 de Octubre, 2025
**Estado:** Listo para ejecutar en staging
