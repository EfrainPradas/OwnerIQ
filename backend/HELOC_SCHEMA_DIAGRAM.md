# HELOC Schema Diagram

## Copia y pega este código en https://www.mermaidchart.com/

```mermaid
erDiagram
    property ||--o{ property_valuation : "has valuations"
    property ||--o{ heloc_line : "has HELOC lines"
    property ||--o{ purchase_scenario : "source for scenarios"
    person ||--o{ property_valuation : "tracks"
    person ||--o{ heloc_line : "owns"
    person ||--o{ purchase_scenario : "analyzes"
    heloc_line ||--o{ heloc_draw : "has draws"
    heloc_line ||--o{ purchase_scenario : "used in scenarios"
    property ||--o{ heloc_draw : "linked to purchase"

    property {
        uuid property_id PK
        uuid person_id FK
        text address
        text city
        text state
        numeric purchase_price
        numeric loan_amount
        numeric valuation
    }

    person {
        uuid person_id PK
        text legal_name
        text primary_email
        text primary_phone
    }

    property_valuation {
        uuid valuation_id PK
        uuid property_id FK
        uuid person_id FK
        date valuation_date
        numeric market_value
        varchar valuation_source
        numeric original_purchase_price
        numeric appreciation_amount "GENERATED"
        numeric appreciation_percent "GENERATED"
        text notes
        timestamp created_at
        timestamp updated_at
    }

    heloc_line {
        uuid heloc_id PK
        uuid property_id FK
        uuid person_id FK
        varchar lender_name
        varchar account_number
        date open_date
        date close_date
        varchar status "active|frozen|closed|paid_off"
        numeric max_credit_limit
        numeric available_credit
        numeric current_balance
        numeric interest_rate
        varchar rate_type "variable|fixed"
        int draw_period_months
        int repayment_period_months
        numeric minimum_monthly_payment
        boolean interest_only_period
        numeric property_value_at_open
        numeric loan_balance_at_open
        numeric ltv_at_open
        text notes
        timestamp created_at
        timestamp updated_at
    }

    heloc_draw {
        uuid draw_id PK
        uuid heloc_id FK
        date draw_date
        numeric draw_amount
        varchar purpose "down_payment|renovation|emergency|investment"
        uuid linked_property_id FK
        numeric interest_rate_at_draw
        text notes
        timestamp created_at
    }

    purchase_scenario {
        uuid scenario_id PK
        uuid person_id FK
        uuid source_property_id FK
        uuid source_heloc_id FK
        numeric target_purchase_price
        varchar target_address
        varchar target_property_type
        numeric down_payment_amount
        numeric down_payment_percent
        numeric heloc_draw_amount
        numeric cash_from_savings
        numeric new_loan_amount
        numeric new_interest_rate
        int new_loan_term_years
        numeric expected_monthly_rent
        numeric estimated_expenses
        numeric monthly_mortgage_payment
        numeric monthly_heloc_payment
        numeric estimated_closing_costs
        numeric closing_cost_percent
        numeric total_cash_invested
        numeric annual_cash_flow
        numeric cash_on_cash_return
        varchar scenario_name
        date scenario_date
        text notes
        timestamp created_at
        timestamp updated_at
    }
```

## Vistas SQL

### current_equity_summary
Muestra el equity actual de todas las propiedades:
- property_id, person_id, address
- original_purchase_price
- current_market_value (más reciente)
- total_appreciation
- appreciation_percent
- current_loan_balance
- current_equity = market_value - loan_amount
- available_heloc_equity = (market_value * 0.80) - loan_amount
- active_heloc_id, heloc_available_credit, heloc_current_balance

### heloc_performance
Muestra el desempeño de cada HELOC:
- heloc_id, property_id, person_id, address
- lender_name, status
- max_credit_limit, available_credit, current_balance
- utilization_rate = current_balance / max_credit_limit
- interest_rate, minimum_monthly_payment
- monthly_interest_cost, annual_interest_cost
- total_draws (count), total_drawn (sum)
- open_date, years_open

## Flujo de Trabajo

1. **Property Valuation** → Actualiza el valor de mercado de una propiedad
2. **Equity Calculation** → Vista calcula equity automáticamente
3. **HELOC Line Creation** → Crea línea de crédito basada en equity disponible
4. **HELOC Draw** → Registra retiro de fondos del HELOC
5. **Purchase Scenario** → Analiza compra de nueva propiedad usando HELOC

## Endpoints API Disponibles

```
GET    /api/heloc/equity-summary              - Ver equity de todas propiedades
GET    /api/heloc/valuations/:propertyId      - Historial de valuaciones
POST   /api/heloc/valuations                  - Agregar nueva valuación
GET    /api/heloc/lines                       - Ver todas las líneas HELOC
GET    /api/heloc/lines/:helocId              - Ver HELOC específico
POST   /api/heloc/lines                       - Crear nueva línea HELOC
PUT    /api/heloc/lines/:helocId              - Actualizar HELOC
GET    /api/heloc/draws/:helocId              - Ver retiros de un HELOC
POST   /api/heloc/draws                       - Registrar nuevo retiro
GET    /api/heloc/scenarios                   - Ver todos los escenarios
POST   /api/heloc/scenarios                   - Crear nuevo escenario
DELETE /api/heloc/scenarios/:scenarioId       - Eliminar escenario
POST   /api/heloc/calculate                   - Calcular escenario HELOC
GET    /api/heloc/performance/:helocId        - Ver performance de HELOC
```

## Ejemplo de Uso

### 1. Actualizar Valuación de Propiedad
```json
POST /api/heloc/valuations
{
  "property_id": "uuid-123",
  "valuation_date": "2025-01-08",
  "market_value": 450000,
  "valuation_source": "zillow",
  "original_purchase_price": 350000
}
```

### 2. Crear Línea HELOC
```json
POST /api/heloc/lines
{
  "property_id": "uuid-123",
  "lender_name": "Wells Fargo",
  "open_date": "2025-01-08",
  "max_credit_limit": 80000,
  "available_credit": 80000,
  "interest_rate": 7.5,
  "property_value_at_open": 450000,
  "loan_balance_at_open": 280000
}
```

### 3. Calcular Escenario de Compra
```json
POST /api/heloc/calculate
{
  "property_value": 450000,
  "current_loan_balance": 280000,
  "purchase_price": 250000,
  "down_payment_percent": 0.20,
  "new_mortgage_rate": 6.5,
  "new_loan_term": 30,
  "expected_monthly_rent": 2500,
  "monthly_expenses": 800,
  "heloc_interest_rate": 7.5
}
```

Respuesta:
```json
{
  "equity_analysis": {
    "current_equity": 170000,
    "available_heloc_equity": 80000,
    "ltv_80_percent": 360000
  },
  "purchase_structure": {
    "down_payment_needed": 50000,
    "heloc_draw": 50000,
    "cash_needed": 0,
    "new_loan_amount": 200000
  },
  "returns": {
    "monthly_mortgage_payment": 1264.14,
    "monthly_heloc_payment": 312.50,
    "monthly_expenses": 800,
    "monthly_rent": 2500,
    "monthly_cash_flow": 123.36,
    "annual_cash_flow": 1480.32,
    "cash_on_cash_return": 0.0296
  }
}
```
