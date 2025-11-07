# Diagrama de Entidad-Relación para OwnerIQ

## Entidades y Atributos

### Users (Usuarios)
- **user_id** (PK): Identificador único del usuario (UUID generado por Supabase Auth)
- email: Correo electrónico del usuario
- full_name: Nombre completo 
- user_metadata: Metadatos del usuario (JSON)
- created_at: Fecha de creación

### Profiles (Perfiles)
- **user_id** (PK, FK): Identificador del usuario (referencia a Users)
- full_name: Nombre completo
- primary_email: Email principal
- primary_phone: Teléfono principal
- created_at: Fecha de creación
- updated_at: Fecha de actualización

### Addresses (Direcciones)
- **address_id** (PK): Identificador único de la dirección
- entity_id: ID de la entidad relacionada (polimórfico)
- entity_type: Tipo de entidad relacionada ('user', 'property', 'borrower', 'lender')
- line1: Línea principal de dirección
- line2: Línea secundaria de dirección (opcional)
- city: Ciudad
- state_code: Código de estado/provincia
- postal_code: Código postal
- is_primary: Indica si es la dirección principal
- created_at: Fecha de creación
- updated_at: Fecha de actualización

### Properties (Propiedades)
- **property_id** (PK): Identificador único de la propiedad
- owner_id (FK): Referencia al usuario propietario
- propertyType: Tipo de propiedad (Residential, Commercial, Industrial, Land)
- address: Dirección de la propiedad
- yearBuilt: Año de construcción
- squareMeters: Metros cuadrados
- valuation: Valoración estimada
- rent: Renta mensual
- taxes: Impuestos anuales
- insurance: Seguro anual
- hoa: Cuota de HOA mensual
- maintenance: Porcentaje de mantenimiento sobre la renta
- vacancy: Porcentaje de vacancia
- created_at: Fecha de creación

### Mortgages (Hipotecas)
- **mortgage_id** (PK): Identificador único de la hipoteca
- property_id (FK): Referencia a la propiedad
- loanAmount: Monto del préstamo
- interestRate: Tasa de interés
- termYears: Plazo en años
- monthlyPayment: Pago mensual
- yearlyPropertyTaxes: Impuestos anuales
- yearlyInsurance: Seguro anual
- firstPaymentDate: Fecha del primer pago
- compoundPeriod: Período de capitalización
- paymentFrequency: Frecuencia de pago
- created_at: Fecha de creación

### Tenants (Inquilinos)
- **tenant_id** (PK): Identificador único del inquilino
- property_id (FK): Referencia a la propiedad alquilada
- name: Nombre completo
- email: Correo electrónico
- phone: Teléfono de contacto
- lease_start: Inicio del contrato de arrendamiento
- lease_end: Fin del contrato de arrendamiento
- rent_amount: Monto de renta mensual
- created_at: Fecha de creación

### Persons (Personas)
- **person_id** (PK): Identificador único de la persona
- kind: Tipo de persona ('borrower', 'lender')
- full_name: Nombre completo (para lenders)
- first_name: Nombre (para borrowers)
- last_name: Apellido (para borrowers)
- primary_phone: Teléfono de contacto
- created_at: Fecha de creación

## Relaciones

1. **Users - Profiles**: 
   - Relación 1:1
   - Un usuario tiene exactamente un perfil

2. **Users - Properties**:
   - Relación 1:N
   - Un usuario puede tener múltiples propiedades
   - Una propiedad pertenece a un solo usuario

3. **Properties - Mortgages**:
   - Relación 1:1
   - Una propiedad puede tener una hipoteca
   - Una hipoteca está asociada a una sola propiedad

4. **Properties - Tenants**:
   - Relación 1:1
   - Una propiedad puede tener un inquilino a la vez
   - Un inquilino está asociado a una sola propiedad

5. **Users - Addresses**:
   - Relación 1:N
   - Un usuario puede tener múltiples direcciones
   - Una dirección pertenece a una entidad específica (polimórfica)

6. **Properties - Addresses**:
   - Relación 1:N
   - Una propiedad puede tener múltiples direcciones
   - Una dirección pertenece a una entidad específica (polimórfica)

7. **Persons - Addresses**:
   - Relación 1:N
   - Una persona puede tener múltiples direcciones
   - Una dirección pertenece a una entidad específica (polimórfica)

## Notas Adicionales

- El sistema utiliza Supabase como base de datos y sistema de autenticación.
- La tabla Addresses implementa un patrón polimórfico para relacionarse con diferentes entidades.
- La tabla Persons utiliza un discriminador (kind) para diferenciar entre diferentes tipos de personas.