# Diagrama ER Simplificado

```mermaid
erDiagram
    PERSON {
        uuid person_id PK
        string full_name
        string primary_email
        string primary_phone
        enum kind "Valores permitidos: 'individual', 'organization'"
        timestamp created_at
    }

    PERSON_ADDRESS {
        uuid address_id PK
        uuid person_id FK
        string line1
        string line2
        string city
        string state_code
        string postal_code
        boolean is_primary
        timestamp created_at
    }

    PROPERTY {
        uuid property_id PK
        uuid owner_id FK "Referencia a PERSON"
        string address
        string propertyType
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

    PROPERTY_LOAN {
        uuid loan_id PK
        uuid property_id FK
        uuid lender_id FK "Referencia a PERSON"
        float loanAmount
        float interestRate
        int termYears
        float monthlyPayment
        date startDate
        timestamp created_at
    }

    TENANT {
        uuid tenant_id PK
        string name
        string email
        string phone
        uuid property_id FK
        date lease_start
        date lease_end
        float rent_amount
        timestamp created_at
    }

    PERSON ||--o{ PERSON_ADDRESS : "tiene"
    PERSON ||--o{ PROPERTY : "posee"
    PERSON ||--o{ PROPERTY_LOAN : "financia"
    PROPERTY ||--o{ PROPERTY_LOAN : "tiene"
    PROPERTY ||--o{ TENANT : "aloja"
```

## Descripción de las Entidades

### PERSON
Esta entidad contiene información sobre personas, con el campo `kind` como discriminador para identificar los diferentes tipos:
- `user`: Usuarios de la aplicación
- `borrower`: Prestatarios 
- `lender`: Prestamistas

### PERSON_ADDRESS
Almacena las direcciones asociadas a las personas, con la capacidad de marcar una dirección como principal.

### PROPERTY
Contiene información sobre propiedades inmobiliarias, incluyendo datos como valoración, renta, impuestos, etc.

### PROPERTY_LOAN
Almacena información sobre préstamos asociados a propiedades, incluyendo datos como monto, tasa de interés, plazos, etc.

### TENANT
Contiene información sobre inquilinos, incluyendo sus contratos de arrendamiento asociados a propiedades.

## Relaciones Principales

1. Una PERSONA puede tener múltiples DIRECCIONES (PERSON_ADDRESS)
2. Una PERSONA puede poseer múltiples PROPIEDADES (PROPERTY)
3. Una PERSONA (lender) puede financiar múltiples PRÉSTAMOS (PROPERTY_LOAN)
4. Una PROPIEDAD puede tener múltiples PRÉSTAMOS (PROPERTY_LOAN)
5. Una PROPIEDAD puede alojar a múltiples INQUILINOS (TENANT)

## Notas Importantes

- La tabla PERSON usa el campo `kind` como discriminador para diferenciar entre usuarios, prestatarios y prestamistas
- No existe un campo `updated_at` en la tabla PERSON, lo que causaba el error en la aplicación
- Los campos de tipo timestamp utilizan ISO 8601 (formato estándar: YYYY-MM-DDTHH:MM:SS.sssZ)