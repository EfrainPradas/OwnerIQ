# Diagrama Entidad-Relación (ERD) Simplificado para OwnerIQ

## Entidades Principales

### Person (Persona)
- **person_id** (PK) - UUID
- kind - Tipo de persona ('individual', 'organization')
- full_name - Nombre completo
- first_name - Nombre
- last_name - Apellido
- primary_email - Correo electrónico principal
- primary_phone - Teléfono principal
- created_at - Fecha de creación

### Person_Address (Dirección de Persona)
- **address_id** (PK) - UUID
- person_id (FK) - Referencia a Person
- kind - Tipo de dirección ('home', 'mailing', 'office', 'other')
- line1 - Línea de dirección 1
- line2 - Línea de dirección 2 (opcional)
- city - Ciudad
- state_code - Código de estado/provincia
- postal_code - Código postal
- country_code - Código de país
- created_at - Fecha de creación

### Property (Propiedad)
- **property_id** (PK) - UUID
- person_id (FK) - Referencia al propietario (Person)
- address - Dirección completa
- valuation - Valoración en USD
- rent - Renta mensual
- taxes - Impuestos anuales
- insurance - Seguro anual
- hoa - Cuota mensual de asociación de propietarios
- maintenance - Porcentaje de mantenimiento
- vacancy - Porcentaje de vacancia
- loan_rate - Tasa de préstamo
- loan_term - Plazo del préstamo
- ltv - Relación préstamo-valor
- created_at - Fecha de creación

### Portfolio (Portafolio)
- **portfolio_id** (PK) - UUID
- owner_user_id - ID del usuario propietario
- name - Nombre del portafolio
- created_at - Fecha de creación

### Property_Loan (Préstamo de Propiedad)
- **loan_id** (PK) - UUID
- property_id (FK) - Referencia a Property
- interest_rate_pct - Tasa de interés (porcentaje)
- term_months - Plazo en meses
- ltv_pct - Porcentaje de relación préstamo-valor
- principal_usd - Monto principal del préstamo
- created_at - Fecha de creación

## Relaciones Importantes

1. **Person → Person_Address**: Una persona puede tener múltiples direcciones (1:N)
2. **Person → Property**: Una persona puede poseer múltiples propiedades (1:N)
3. **Property → Property_Loan**: Una propiedad puede tener un préstamo asociado (1:1)
4. **Person → Portfolio_Member → Portfolio**: Personas pueden pertenecer a múltiples portafolios con diferentes roles (N:M)

## Tipos Enumerados Clave

- **person_kind**: 'individual', 'organization'
- **address_kind**: 'home', 'mailing', 'office', 'other'
- **property_type**: 'single_family', 'townhouse', 'condo', 'multi_family', 'commercial'
- **portfolio_role**: 'owner', 'manager', 'viewer'

## Diagrama Visual

```mermaid
erDiagram
    PERSON ||--o{ PERSON_ADDRESS : "tiene"
    PERSON ||--o{ PROPERTY : "posee"
    PROPERTY ||--o| PROPERTY_LOAN : "tiene"
    PERSON ||--o{ PORTFOLIO_MEMBER : "participa"
    PORTFOLIO_MEMBER }o--|| PORTFOLIO : "pertenece"
    PROPERTY ||--o{ PROPERTY_VALUATION : "tiene"
    PROPERTY ||--o{ PROPERTY_RENT_ESTIMATE : "tiene"
    PROPERTY ||--o{ PROPERTY_OPERATING_INPUTS : "tiene"
    PROPERTY ||--o{ PROPERTY_METRICS : "tiene"
    PROPERTY ||--o{ PROPERTY_DEALSCORE : "tiene"
    
    PERSON {
        uuid person_id PK
        string kind
        string full_name
        string first_name
        string last_name
        string primary_email
        string primary_phone
        timestamp created_at
    }
    
    PERSON_ADDRESS {
        uuid address_id PK
        uuid person_id FK
        string kind
        string line1
        string line2
        string city
        string state_code
        string postal_code
        string country_code
        timestamp created_at
    }
    
    PROPERTY {
        uuid property_id PK
        uuid person_id FK
        string address
        decimal valuation
        decimal rent
        decimal taxes
        decimal insurance
        decimal hoa
        decimal maintenance
        decimal vacancy
        decimal loan_rate
        int loan_term
        decimal ltv
        timestamp created_at
    }
    
    PROPERTY_LOAN {
        uuid loan_id PK
        uuid property_id FK
        decimal interest_rate_pct
        int term_months
        decimal ltv_pct
        decimal principal_usd
        timestamp created_at
    }
    
    PORTFOLIO {
        uuid portfolio_id PK
        uuid owner_user_id
        string name
        timestamp created_at
    }
    
    PORTFOLIO_MEMBER {
        uuid portfolio_id PK,FK
        uuid person_id PK,FK
        string role
        timestamp added_at
    }
    
    PROPERTY_VALUATION {
        uuid valuation_id PK
        uuid property_id FK
        decimal amount_usd
        date as_of_date
        string source
        timestamp created_at
    }
    
    PROPERTY_RENT_ESTIMATE {
        uuid rent_id PK
        uuid property_id FK
        decimal market_rent_month
        date as_of_date
        string source
        timestamp created_at
    }
    
    PROPERTY_OPERATING_INPUTS {
        uuid input_id PK
        uuid property_id FK
        decimal vacancy_rate_pct
        decimal taxes_annual
        decimal insurance_annual
        decimal hoa_monthly
        decimal maintenance_pct
        decimal other_opex_annual
        timestamp created_at
    }
    
    PROPERTY_METRICS {
        uuid metrics_id PK
        uuid property_id FK
        decimal noi
        decimal cap_rate
        decimal cash_on_cash
        decimal dscr
        decimal cash_flow_net
        decimal debt_service_ann
        date as_of_date
        timestamp created_at
    }
    
    PROPERTY_DEALSCORE {
        uuid dealscore_id PK
        uuid property_id FK
        uuid rule_set_id FK
        decimal dealscore
        decimal cap_rate_norm
        decimal coc_norm
        decimal dscr_norm
        decimal appreciation_norm
        decimal risk_norm
        decimal liquidity_norm
        string recommendation
        string explanation
        date as_of_date
        timestamp created_at
    }
```

## Notas Importantes

1. La entidad `person` es la base para diferentes tipos de usuarios, incluyendo propietarios, prestamistas e inquilinos.

2. Las propiedades tienen múltiples métricas financieras asociadas que se almacenan en tablas separadas para facilitar el seguimiento histórico.

3. El sistema utiliza UUIDs como claves primarias en todas las tablas.

4. Las relaciones entre personas y propiedades son fundamentales para el funcionamiento del sistema.

5. Existen múltiples tablas de métricas y evaluación para propiedades que permiten análisis detallados de rendimiento e inversión.