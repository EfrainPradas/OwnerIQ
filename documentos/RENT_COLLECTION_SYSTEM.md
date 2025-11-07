# 🏠 Sistema de Cobro de Alquiler - OwnerIQ

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Tablas Principales](#tablas-principales)
4. [Funciones SQL](#funciones-sql)
5. [Flujo de Trabajo](#flujo-de-trabajo)
6. [Ejemplos de Uso](#ejemplos-de-uso)
7. [Integración con Stripe](#integración-con-stripe)
8. [Reportes y Vistas](#reportes-y-vistas)
9. [Mejores Prácticas](#mejores-prácticas)

---

## 🎯 Resumen Ejecutivo

Sistema completo end-to-end para gestión de cobro de alquileres que incluye:

- ✅ **Generación automática de facturas mensuales**
- ✅ **Late fees configurables** (fijo, porcentaje, diario, compuesto)
- ✅ **Procesamiento de pagos** con múltiples métodos
- ✅ **Aplicación automática FIFO** de pagos a facturas
- ✅ **Contabilidad integrada** con asientos automáticos
- ✅ **Auditoría completa** de todas las transacciones
- ✅ **Vistas y reportes** pre-construidos

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    RENT COLLECTION SYSTEM                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │  LEASE  │          │ INVOICE │          │ PAYMENT │
   │ MGMT    │──────────│  MGMT   │──────────│  MGMT   │
   └─────────┘          └─────────┘          └─────────┘
        │                     │                     │
        │              ┌──────▼──────┐             │
        │              │ LATE FEES   │             │
        │              │ AUTOMATION  │             │
        │              └─────────────┘             │
        │                                          │
        └──────────────┬───────────────────────────┘
                       │
                 ┌─────▼─────┐
                 │ACCOUNTING │
                 │INTEGRATION│
                 └───────────┘
```

---

## 📊 Tablas Principales

### 1. **lease** - Contratos de Arrendamiento

Almacena información de contratos entre propietarios y tenants.

```sql
CREATE TABLE lease (
  lease_id          UUID PRIMARY KEY,
  property_id       UUID NOT NULL,
  tenant_person_id  UUID NOT NULL,
  lease_number      TEXT UNIQUE,
  status            lease_status,  -- draft, active, expired, terminated
  start_date        DATE NOT NULL,
  end_date          DATE,
  monthly_rent      NUMERIC(10,2) NOT NULL,
  security_deposit  NUMERIC(10,2),
  rent_due_day      INT DEFAULT 1,
  auto_generate_invoices BOOLEAN DEFAULT TRUE
);
```

**Campos Clave:**
- `rent_due_day`: Día del mes en que vence la renta (1-31)
- `auto_generate_invoices`: Si TRUE, genera facturas automáticamente
- `status`: Controla si el lease está activo para facturación

---

### 2. **rent_invoice** - Facturas de Renta

Facturas mensuales generadas automáticamente o manualmente.

```sql
CREATE TABLE rent_invoice (
  invoice_id        UUID PRIMARY KEY,
  lease_id          UUID NOT NULL,
  period_year       INT NOT NULL,
  period_month      INT NOT NULL,
  invoice_number    TEXT UNIQUE,
  due_date          DATE NOT NULL,
  base_amount       NUMERIC(12,2) NOT NULL,
  adjustments_total NUMERIC(12,2) DEFAULT 0,
  amount_due        NUMERIC(12,2) NOT NULL,
  amount_paid       NUMERIC(12,2) DEFAULT 0,
  status            invoice_status  -- pending, partial, paid, late, void
);
```

**Estados de Factura:**
- `pending`: No pagada, no vencida
- `partial`: Pago parcial recibido
- `paid`: Completamente pagada
- `late`: Vencida sin pagar
- `void`: Cancelada
- `cancelled`: Anulada

---

### 3. **rent_invoice_adjustment** - Ajustes a Facturas

Late fees, descuentos, créditos, etc.

```sql
CREATE TABLE rent_invoice_adjustment (
  adj_id       UUID PRIMARY KEY,
  invoice_id   UUID NOT NULL,
  kind         adjustment_kind,  -- late_fee, discount, credit, misc
  amount_delta NUMERIC(12,2) NOT NULL,  -- + cargo, - crédito
  reason       TEXT NOT NULL,
  applied_date DATE DEFAULT CURRENT_DATE
);
```

**Tipos de Ajustes:**
- `late_fee`: Cargo por pago tardío
- `discount`: Descuento aplicado
- `credit`: Crédito al tenant
- `proration`: Prorrateo de renta
- `refund`: Reembolso

---

### 4. **late_fee_policy** - Políticas de Late Fees

Configuración de cargos por pago tardío.

```sql
CREATE TABLE late_fee_policy (
  policy_id        UUID PRIMARY KEY,
  lease_id         UUID UNIQUE,      -- NULL = aplica a portfolio
  portfolio_id     UUID,
  grace_days       INT DEFAULT 3,
  mode             late_fee_mode,    -- fixed, percent, daily, compound
  fixed_amount     NUMERIC(10,2),
  percent_rate     NUMERIC(6,3),
  daily_amount     NUMERIC(10,2),
  max_cap          NUMERIC(10,2),
  max_applications INT
);
```

**Modos de Cálculo:**
- `fixed`: Monto fijo por retraso
- `percent`: Porcentaje del monto debido
- `daily`: Cargo diario acumulativo
- `compound`: Fijo + diario combinados

---

### 5. **payment_transaction** - Transacciones de Pago

Registro de todos los pagos recibidos.

```sql
CREATE TABLE payment_transaction (
  payment_id       UUID PRIMARY KEY,
  invoice_id       UUID,
  lease_id         UUID NOT NULL,
  payment_number   TEXT UNIQUE,
  method           payment_method,  -- stripe_card, stripe_ach, cash, check
  external_id      TEXT,            -- Stripe payment intent ID
  amount_usd       NUMERIC(12,2) NOT NULL,
  fee_usd          NUMERIC(12,2) DEFAULT 0,
  net_amount       NUMERIC(12,2) GENERATED,
  status           payment_status,  -- initiated, succeeded, failed, refunded
  received_at      TIMESTAMPTZ
);
```

---

## ⚙️ Funciones SQL

### 1. **gen_rent_invoices()** - Generar Facturas Mensuales

Genera facturas automáticamente para todos los leases activos.

```sql
SELECT * FROM gen_rent_invoices('2025-01-01');
```

**Retorna:**
```
created_count | skipped_count | total_amount
--------------+---------------+--------------
     15       |       3       |   22500.00
```

**Parámetros:**
- `p_as_of`: Fecha de corte (default: hoy)

**Comportamiento:**
- Solo procesa leases con `status = 'active'`
- Solo si `auto_generate_invoices = TRUE`
- Respeta `rent_due_day` del lease
- Evita duplicados (unique constraint)

---

### 2. **apply_late_fees()** - Aplicar Late Fees Automáticos

Aplica cargos por pago tardío según políticas configuradas.

```sql
SELECT * FROM apply_late_fees('2025-01-15');
```

**Retorna:**
```
applied_count | total_fees
--------------+------------
      8       |   400.00
```

**Parámetros:**
- `p_today`: Fecha de evaluación (default: hoy)

**Comportamiento:**
- Busca facturas vencidas (`due_date < p_today`)
- Respeta `grace_days` de la política
- Aplica según `mode` (fixed, percent, daily, compound)
- Respeta `max_cap` y `max_applications`
- Evita duplicados en el mismo mes

---

### 3. **apply_payment_to_invoices()** - Aplicar Pago a Facturas

Distribuye un pago entre facturas pendientes (FIFO).

```sql
SELECT * FROM apply_payment_to_invoices('payment-uuid-here');
```

**Retorna:**
```
invoices_affected | amount_applied
------------------+----------------
        3         |    1500.00
```

**Comportamiento:**
- Aplica pagos en orden FIFO (más antiguo primero)
- Actualiza `amount_paid` y `status` de facturas
- Vincula pago a primera factura afectada
- Marca facturas como `paid` cuando se completan

---

### 4. **create_payment_journal_entry()** - Crear Asiento Contable

Genera asiento contable automático por pago recibido.

```sql
SELECT create_payment_journal_entry('payment-uuid-here');
```

**Retorna:** `journal_id` del asiento creado

**Asiento Generado:**
```
DR  Cash                    $1,485.00
DR  Processing Fee          $   15.00
    CR  Rent Income                      $1,500.00
```

---

## 🔄 Flujo de Trabajo

### Flujo Completo de Cobro Mensual

```
1. INICIO DE MES
   └─> gen_rent_invoices()
       └─> Crea facturas para todos los leases activos
       
2. TENANT RECIBE NOTIFICACIÓN
   └─> Email/SMS con link de pago
   
3. TENANT REALIZA PAGO
   └─> Stripe webhook recibido
       └─> INSERT INTO payment_transaction
           └─> apply_payment_to_invoices()
               └─> Actualiza facturas
               └─> create_payment_journal_entry()
                   └─> Registra en contabilidad
                   
4. DESPUÉS DE DUE_DATE + GRACE_DAYS
   └─> apply_late_fees() (cron job diario)
       └─> Aplica cargos a facturas vencidas
       └─> Actualiza amount_due
       
5. REPORTES Y SEGUIMIENTO
   └─> v_lease_balance
   └─> v_rent_invoice_detail
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Crear un Lease y Generar Primera Factura

```sql
-- 1. Crear lease
INSERT INTO lease (
  property_id,
  tenant_person_id,
  lease_number,
  status,
  start_date,
  end_date,
  monthly_rent,
  security_deposit,
  rent_due_day
) VALUES (
  'property-uuid',
  'tenant-uuid',
  'LSE-2025-001',
  'active',
  '2025-01-01',
  '2026-01-01',
  1500.00,
  1500.00,
  5  -- Vence el día 5 de cada mes
);

-- 2. Configurar política de late fees
INSERT INTO late_fee_policy (
  lease_id,
  grace_days,
  mode,
  fixed_amount,
  daily_amount,
  max_cap
) VALUES (
  'lease-uuid',
  3,              -- 3 días de gracia
  'compound',     -- Fee fijo + diario
  50.00,          -- $50 fee inicial
  10.00,          -- $10 por día adicional
  200.00          -- Máximo $200
);

-- 3. Generar factura del mes
SELECT * FROM gen_rent_invoices('2025-01-01');
```

---

### Ejemplo 2: Procesar Pago de Stripe

```sql
-- 1. Registrar pago (desde webhook de Stripe)
INSERT INTO payment_transaction (
  lease_id,
  payment_number,
  method,
  external_id,
  amount_usd,
  fee_usd,
  status,
  received_at,
  payload
) VALUES (
  'lease-uuid',
  'PAY-20250105-abc123',
  'stripe_card',
  'pi_1234567890',
  1500.00,
  43.50,  -- 2.9% + $0.30
  'succeeded',
  now(),
  '{"stripe_data": "..."}'::jsonb
)
RETURNING payment_id;

-- 2. Aplicar pago a facturas
SELECT * FROM apply_payment_to_invoices('payment-uuid');

-- 3. Crear asiento contable
SELECT create_payment_journal_entry('payment-uuid');
```

---

### Ejemplo 3: Aplicar Late Fees Manualmente

```sql
-- Ejecutar proceso de late fees para hoy
SELECT * FROM apply_late_fees(CURRENT_DATE);

-- Ver facturas con late fees aplicados
SELECT 
  i.invoice_number,
  i.period_year,
  i.period_month,
  i.base_amount,
  i.adjustments_total,
  i.amount_due,
  i.status,
  COUNT(a.adj_id) as late_fee_count,
  SUM(a.amount_delta) FILTER (WHERE a.kind = 'late_fee') as total_late_fees
FROM rent_invoice i
LEFT JOIN rent_invoice_adjustment a ON a.invoice_id = i.invoice_id
WHERE i.status = 'late'
GROUP BY i.invoice_id, i.invoice_number, i.period_year, i.period_month, 
         i.base_amount, i.adjustments_total, i.amount_due, i.status;
```

---

### Ejemplo 4: Aplicar Descuento a Factura

```sql
-- Aplicar descuento del 10% por pago anticipado
INSERT INTO rent_invoice_adjustment (
  invoice_id,
  kind,
  amount_delta,
  reason
) VALUES (
  'invoice-uuid',
  'discount',
  -150.00,  -- Negativo = reduce deuda
  'Early payment discount (10%)'
);

-- El trigger recalcula automáticamente amount_due
```

---

### Ejemplo 5: Consultar Balance de un Tenant

```sql
-- Ver balance completo de un lease
SELECT * FROM v_lease_balance
WHERE lease_id = 'lease-uuid';

-- Ver detalle de facturas pendientes
SELECT 
  invoice_number,
  period_year,
  period_month,
  due_date,
  amount_due,
  amount_paid,
  balance,
  days_overdue,
  status
FROM v_rent_invoice_detail
WHERE lease_id = 'lease-uuid'
  AND status IN ('pending', 'partial', 'late')
ORDER BY period_year, period_month;
```

---

## 💳 Integración con Stripe

### Webhook Handler (Node.js/Express)

```javascript
// backend/routes/stripe-webhooks.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabase } = require('../supabaseClient');

app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle payment intent succeeded
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Registrar pago en DB
    const { data: payment, error } = await supabase
      .from('payment_transaction')
      .insert({
        lease_id: paymentIntent.metadata.lease_id,
        method: 'stripe_card',
        external_id: paymentIntent.id,
        amount_usd: paymentIntent.amount / 100,
        fee_usd: (paymentIntent.amount * 0.029 + 30) / 100,
        status: 'succeeded',
        received_at: new Date(),
        payload: paymentIntent
      })
      .select()
      .single();

    if (!error) {
      // Aplicar pago a facturas
      await supabase.rpc('apply_payment_to_invoices', {
        p_payment_id: payment.payment_id
      });

      // Crear asiento contable
      await supabase.rpc('create_payment_journal_entry', {
        p_payment_id: payment.payment_id
      });
    }
  }

  res.json({ received: true });
});
```

---

## 📊 Reportes y Vistas

### Vista: Balance por Lease

```sql
SELECT * FROM v_lease_balance
WHERE total_balance > 0
ORDER BY total_balance DESC;
```

**Columnas:**
- `total_invoices`: Total de facturas generadas
- `paid_invoices`: Facturas completamente pagadas
- `unpaid_invoices`: Facturas pendientes/parciales
- `total_billed`: Monto total facturado
- `total_paid`: Monto total pagado
- `total_balance`: Balance pendiente
- `next_due_date`: Próxima fecha de vencimiento

---

### Vista: Detalle de Facturas

```sql
SELECT * FROM v_rent_invoice_detail
WHERE status = 'late'
  AND days_overdue > 10
ORDER BY days_overdue DESC;
```

**Columnas Adicionales:**
- `tenant_name`: Nombre del tenant
- `tenant_email`: Email del tenant
- `property_address`: Dirección de la propiedad
- `balance`: Monto pendiente
- `days_overdue`: Días de retraso

---

### Vista: Detalle de Pagos

```sql
SELECT * FROM v_payment_detail
WHERE received_at >= '2025-01-01'
ORDER BY received_at DESC;
```

---

### Reporte: Ingresos Mensuales

```sql
SELECT 
  period_year,
  period_month,
  COUNT(*) as invoices_generated,
  SUM(base_amount) as base_rent,
  SUM(adjustments_total) as adjustments,
  SUM(amount_due) as total_billed,
  SUM(amount_paid) as total_collected,
  SUM(amount_due - amount_paid) as outstanding,
  ROUND(SUM(amount_paid) * 100.0 / NULLIF(SUM(amount_due), 0), 2) as collection_rate
FROM rent_invoice
WHERE period_year = 2025
GROUP BY period_year, period_month
ORDER BY period_year, period_month;
```

---

### Reporte: Late Fees Aplicados

```sql
SELECT 
  DATE_TRUNC('month', applied_date) as month,
  COUNT(*) as late_fees_applied,
  SUM(amount_delta) as total_late_fees,
  AVG(amount_delta) as avg_late_fee
FROM rent_invoice_adjustment
WHERE kind = 'late_fee'
  AND applied_date >= '2025-01-01'
GROUP BY DATE_TRUNC('month', applied_date)
ORDER BY month;
```

---

## 🎯 Mejores Prácticas

### 1. Automatización con Cron Jobs

```bash
# Generar facturas el día 1 de cada mes a las 00:01
1 0 1 * * psql -d owneriq -c "SELECT gen_rent_invoices(CURRENT_DATE);"

# Aplicar late fees diariamente a las 06:00
0 6 * * * psql -d owneriq -c "SELECT apply_late_fees(CURRENT_DATE);"

# Enviar recordatorios 3 días antes del vencimiento
0 8 * * * node /app/scripts/send-payment-reminders.js
```

---

### 2. Notificaciones a Tenants

```javascript
// Enviar recordatorio de pago
async function sendPaymentReminder(invoiceId) {
  const { data: invoice } = await supabase
    .from('v_rent_invoice_detail')
    .select('*')
    .eq('invoice_id', invoiceId)
    .single();

  const daysUntilDue = Math.ceil(
    (new Date(invoice.due_date) - new Date()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilDue === 3) {
    await sendEmail({
      to: invoice.tenant_email,
      subject: `Rent Payment Due in ${daysUntilDue} Days`,
      template: 'payment-reminder',
      data: {
        tenant_name: invoice.tenant_name,
        amount_due: invoice.balance,
        due_date: invoice.due_date,
        payment_link: `https://app.owneriq.com/pay/${invoice.invoice_id}`
      }
    });

    // Marcar recordatorio enviado
    await supabase
      .from('rent_invoice')
      .update({ reminder_sent_at: new Date() })
      .eq('invoice_id', invoiceId);
  }
}
```

---

### 3. Manejo de Pagos Parciales

```sql
-- Permitir pagos parciales en el lease
UPDATE lease
SET allow_partial_payments = TRUE
WHERE lease_id = 'lease-uuid';

-- Los pagos parciales actualizan el status a 'partial'
-- y permiten múltiples pagos hasta completar la factura
```

---

### 4. Cancelar/Anular Facturas

```sql
-- Anular una factura (no se puede pagar)
UPDATE rent_invoice
SET status = 'void',
    notes = 'Cancelled due to lease termination'
WHERE invoice_id = 'invoice-uuid';

-- Reembolsar un pago
UPDATE payment_transaction
SET status = 'refunded'
WHERE payment_id = 'payment-uuid';

-- Crear ajuste de crédito
INSERT INTO rent_invoice_adjustment (
  invoice_id,
  kind,
  amount_delta,
  reason
) VALUES (
  'invoice-uuid',
  'refund',
  -1500.00,
  'Refund for overpayment'
);
```

---

### 5. Auditoría y Compliance

```sql
-- Ver historial de cambios en una factura
SELECT * FROM rent_audit_log
WHERE table_name = 'rent_invoice'
  AND record_id = 'invoice-uuid'
ORDER BY changed_at DESC;

-- Ver todos los pagos de un tenant
SELECT 
  pt.payment_number,
  pt.method,
  pt.amount_usd,
  pt.status,
  pt.received_at,
  i.invoice_number,
  i.period_year,
  i.period_month
FROM payment_transaction pt
LEFT JOIN rent_invoice i ON i.invoice_id = pt.invoice_id
WHERE pt.lease_id IN (
  SELECT lease_id FROM lease WHERE tenant_person_id = 'tenant-uuid'
)
ORDER BY pt.received_at DESC;
```

---

## 🚀 Próximos Pasos

1. **Ejecutar la migración:**
   ```bash
   psql -d owneriq -f migrations/20251009_rent_collection_system.sql
   ```

2. **Configurar webhooks de Stripe**

3. **Crear cron jobs para automatización**

4. **Implementar frontend para:**
   - Portal de pago para tenants
   - Dashboard de cobros para propietarios
   - Reportes y analytics

5. **Agregar notificaciones:**
   - Email/SMS para recordatorios
   - Alertas de pagos recibidos
   - Notificaciones de late fees

---

## 📞 Soporte

Para preguntas o mejoras, contactar al equipo de desarrollo.

**Versión:** 1.0.0  
**Fecha:** 2025-10-09  
**Autor:** Kilo Code