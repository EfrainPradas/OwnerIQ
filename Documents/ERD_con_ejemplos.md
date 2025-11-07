# Diagrama de Entidad-Relación con Ejemplos para OwnerIQ

Este documento muestra un ERD simplificado con ejemplos de datos para facilitar la comprensión de la estructura de la base de datos.

## Ejemplo de Datos Relacionados

### 1. Usuario y Perfil

**Users**
| user_id | email | full_name | created_at |
|---------|-------|-----------|------------|
| u123abc | juan.perez@email.com | Juan Pérez | 2025-01-15 |

**Profiles**
| user_id | full_name | primary_email | primary_phone | created_at |
|---------|-----------|---------------|--------------|------------|
| u123abc | Juan Pérez | juan.perez@email.com | +1-555-123-4567 | 2025-01-15 |

### 2. Propiedad y Dirección

**Properties**
| property_id | owner_id | propertyType | address | valuation | rent | taxes |
|-------------|----------|--------------|---------|-----------|------|-------|
| p456def | u123abc | Residential | 123 Main St, Miami, FL | 450000 | 2800 | 5000 |

**Addresses** (dirección asociada a la propiedad)
| address_id | entity_id | entity_type | line1 | city | state_code | postal_code |
|------------|-----------|-------------|-------|------|------------|-------------|
| a789ghi | p456def | property | 123 Main St | Miami | FL | 33101 |

### 3. Usuario y Direcciones

**Addresses** (direcciones del usuario)
| address_id | entity_id | entity_type | line1 | city | state_code | postal_code | is_primary |
|------------|-----------|-------------|-------|------|------------|-------------|------------|
| a234jkl | u123abc | user | 789 Resident Ave | Miami | FL | 33150 | true |
| a567mno | u123abc | user | 456 Summer St | Tampa | FL | 33601 | false |

### 4. Propiedad e Hipoteca

**Mortgages**
| mortgage_id | property_id | loanAmount | interestRate | termYears | monthlyPayment |
|-------------|-------------|------------|--------------|-----------|----------------|
| m890pqr | p456def | 360000 | 4.5 | 30 | 1824.33 |

### 5. Propiedad e Inquilino

**Tenants**
| tenant_id | property_id | name | email | phone | lease_start | lease_end | rent_amount |
|-----------|-------------|------|-------|-------|-------------|-----------|-------------|
| t123stu | p456def | María García | maria@email.com | +1-555-987-6543 | 2025-02-01 | 2026-01-31 | 2800 |

### 6. Persona (Prestamista/Prestatario)

**Persons** (ejemplo de un prestatario)
| person_id | kind | first_name | last_name | primary_phone | created_at |
|-----------|------|------------|-----------|---------------|------------|
| b456vwx | borrower | Carlos | Sánchez | +1-555-111-2222 | 2025-01-20 |

**Persons** (ejemplo de un prestamista)
| person_id | kind | full_name | primary_phone | created_at |
|-----------|------|-----------|---------------|------------|
| l789yz1 | lender | First National Bank | +1-555-999-8888 | 2025-01-10 |

**Addresses** (dirección del prestamista)
| address_id | entity_id | entity_type | line1 | city | state_code | postal_code |
|------------|-----------|-------------|-------|------|------------|-------------|
| a901abc | l789yz1 | lender | 100 Finance Blvd | Chicago | IL | 60601 |

## Flujo de Relaciones en Ejemplo Completo

1. Un usuario (**Juan Pérez**) tiene:
   - Un perfil asociado con sus datos de contacto
   - Múltiples direcciones personales (una principal en Miami, otra secundaria en Tampa)
   - Una propiedad residencial en Miami

2. La propiedad de **Juan Pérez**:
   - Tiene una dirección asociada en Miami
   - Está financiada con una hipoteca de $360,000
   - Está alquilada a **María García** por $2,800 mensuales

3. En el sistema también hay:
   - Un prestatario llamado **Carlos Sánchez** (posiblemente buscando financiamiento)
   - Un prestamista **First National Bank** con dirección en Chicago

Este ejemplo muestra cómo las entidades se conectan entre sí para formar la estructura completa del sistema de gestión de propiedades OwnerIQ.

## Notas sobre la Estructura Polimórfica

El sistema utiliza un enfoque polimórfico para las direcciones, lo que permite asociar direcciones a diferentes tipos de entidades (usuarios, propiedades, prestamistas, prestatarios) utilizando los campos `entity_id` y `entity_type`. Esto proporciona flexibilidad y evita tener que crear tablas de direcciones separadas para cada tipo de entidad.

De manera similar, la tabla `Persons` utiliza un discriminador `kind` para diferenciar entre diferentes tipos de personas (prestamistas o prestatarios), permitiendo almacenar atributos específicos según el tipo.