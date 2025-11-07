# Diagrama Entidad-Relación (ERD) para OwnerIQ

Este diagrama muestra las principales entidades y relaciones en la base de datos de OwnerIQ.

## Estructura de la Base de Datos

```mermaid
erDiagram
    person ||--o{ person_address : has
    person ||--o{ person_contact : has
    person ||--o{ property : owns
    person ||--o{ watchlist : has
    person ||--o{ saved_search : has
    person ||--o{ buy_box : has
    person ||--o| investor_profile : has
    person ||--o| funding_profile : has
    person }o--o{ portfolio : member_of
    property ||--o{ property_valuation : has
    property ||--o{ property_rent_estimate : has
    property ||--o{ property_operating_inputs : has
    property ||--o{ property_loan : has
    property ||--o{ property_metrics : has
    property ||--o{ property_dealscore : has
    property }o--o{ watchlist : included_in
    property }o--o{ recommendation_log : recommended
    region ||--o{ market_stats : has
    region }o--o{ buy_box : targeted_by
    buy_box ||--o{ buy_box_market : has
    buy_box ||--o{ buy_box_property_type : has
    person ||--o{ consent_event : has
    dealscore_rule_set ||--o{ property_dealscore : used_by
    dealscore_rule_set ||--o{ recommendation_log : used_by
    watchlist ||--o{ watchlist_item : contains

    person {
        UUID person_id PK
        person_kind kind "individual/organization"
        TEXT full_name
        TEXT first_name
        TEXT last_name
        TEXT primary_email UK
        TEXT primary_phone
        TEXT external_ref
        DATE dob
        TEXT tax_id_hash
        TIMESTAMPTZ created_at
    }

    person_address {
        UUID address_id PK
        UUID person_id FK
        address_kind kind "home/mailing/office/other"
        TEXT line1
        TEXT line2
        TEXT city
        TEXT state_code
        TEXT postal_code
        TEXT country_code
        TIMESTAMPTZ created_at
    }

    person_contact {
        UUID contact_id PK
        UUID person_id FK
        contact_kind kind
        TEXT value
        BOOLEAN is_primary
        TIMESTAMPTZ created_at
    }

    property {
        UUID property_id PK
        UUID person_id FK
        TEXT address
        NUMERIC valuation
        NUMERIC rent
        NUMERIC taxes
        NUMERIC insurance
        NUMERIC hoa
        NUMERIC maintenance
        NUMERIC vacancy
        NUMERIC loan_rate
        INT loan_term
        NUMERIC ltv
        TIMESTAMPTZ created_at
    }
    
    portfolio {
        UUID portfolio_id PK
        UUID owner_user_id
        TEXT name
        TIMESTAMPTZ created_at
    }
```

## Explicación

1. **person**: Tabla central que almacena información de personas (individuos u organizaciones)
2. **person_address**: Almacena direcciones asociadas a una persona
3. **person_contact**: Almacena información de contacto (email, teléfono, etc.)
4. **property**: Propiedades inmobiliarias en el sistema
5. **portfolio**: Colecciones de propiedades

## Problema Identificado

El código de la aplicación en `handleAddressSubmit()` (App.js) y `handleProfileUpdate()` está intentando manipular el campo `is_primary` en la tabla `person_address`, pero este campo **no existe** en el esquema actual según el archivo schema.sql. Esto podría estar causando que las actualizaciones a las direcciones no funcionen correctamente.

## Solución Propuesta

Modificar el esquema para agregar el campo `is_primary` a la tabla `person_address`:

```sql
ALTER TABLE person_address ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS u_person_primary_address
  ON person_address(person_id) WHERE is_primary;
```

Esta modificación hará que la estructura de la tabla `person_address` sea coherente con lo que el código espera, lo que debería resolver el problema de actualizaciones.