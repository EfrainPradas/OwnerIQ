# Diagrama de Entidad-Relación Visual para OwnerIQ

```mermaid
erDiagram
    Users ||--|| Profiles : has
    Users ||--o{ Properties : owns
    Users ||--o{ Addresses : has
    Properties ||--o| Mortgages : has
    Properties ||--o| Tenants : leased_by
    Properties ||--o{ Addresses : has
    Persons ||--o{ Addresses : has

    Users {
        uuid user_id PK
        string email
        string full_name
        json user_metadata
        timestamp created_at
    }

    Profiles {
        uuid user_id PK,FK
        string full_name
        string primary_email
        string primary_phone
        timestamp created_at
        timestamp updated_at
    }

    Addresses {
        uuid address_id PK
        string entity_id FK
        string entity_type
        string line1
        string line2
        string city
        string state_code
        string postal_code
        boolean is_primary
        timestamp created_at
        timestamp updated_at
    }

    Properties {
        uuid property_id PK
        uuid owner_id FK
        string propertyType
        string address
        int yearBuilt
        float squareMeters
        float valuation
        float rent
        float taxes
        float insurance
        float hoa
        float maintenance
        float vacancy
        timestamp created_at
    }

    Mortgages {
        uuid mortgage_id PK
        uuid property_id FK
        float loanAmount
        float interestRate
        int termYears
        float monthlyPayment
        float yearlyPropertyTaxes
        float yearlyInsurance
        date firstPaymentDate
        string compoundPeriod
        string paymentFrequency
        timestamp created_at
    }

    Tenants {
        uuid tenant_id PK
        uuid property_id FK
        string name
        string email
        string phone
        date lease_start
        date lease_end
        float rent_amount
        timestamp created_at
    }

    Persons {
        uuid person_id PK
        string kind
        string full_name
        string first_name
        string last_name
        string primary_phone
        timestamp created_at
    }
```

## Notas sobre el diagrama

- La notación utilizada en las relaciones:
  - `||--||`: Relación uno a uno
  - `||--o{`: Relación uno a muchos
  - `||--o|`: Relación uno a cero/uno (opcional)
  
- Entity-type en la tabla Addresses:
  - Esta tabla utiliza un patrón polimórfico donde `entity_type` indica el tipo de entidad ('user', 'property', 'borrower', 'lender')
  - `entity_id` es la clave foránea que apunta a diferentes tablas según el valor de `entity_type`

- Kind en la tabla Persons:
  - Esta tabla utiliza un discriminador donde `kind` indica el tipo específico de persona ('borrower', 'lender')
  - Algunos campos son específicos según el tipo (first_name/last_name para borrowers, full_name para lenders)