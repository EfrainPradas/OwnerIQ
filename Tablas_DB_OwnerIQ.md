# Tablas de la Base de Datos OwnerIQ

Este documento detalla la estructura técnica de las tablas en la base de datos de OwnerIQ, incluyendo definiciones de campos, tipos de datos y restricciones.

## Tablas Principales

### 1. Users

Tabla gestionada por Supabase Auth que almacena información de autenticación de usuarios.

```sql
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE,
  encrypted_password VARCHAR NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  raw_app_meta_data JSONB,
  raw_user_meta_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### 2. Profiles

Almacena información adicional del perfil de usuario.

```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name VARCHAR,
  primary_email VARCHAR,
  primary_phone VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_profiles_email ON profiles(primary_email);
```

### 3. Properties

Almacena información sobre propiedades inmobiliarias.

```sql
CREATE TABLE properties (
  property_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id),
  property_type VARCHAR NOT NULL,
  address VARCHAR NOT NULL,
  year_built INTEGER,
  square_meters NUMERIC(10, 2),
  valuation NUMERIC(14, 2),
  rent NUMERIC(10, 2),
  taxes NUMERIC(10, 2),
  insurance NUMERIC(10, 2),
  hoa NUMERIC(10, 2),
  maintenance NUMERIC(5, 2), -- Porcentaje
  vacancy NUMERIC(5, 2), -- Porcentaje
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_property_type CHECK (property_type IN ('residential', 'commercial', 'industrial', 'land'))
);

-- Índices
CREATE INDEX idx_properties_owner ON properties(owner_id);
CREATE INDEX idx_properties_type ON properties(property_type);
```

### 4. Addresses

Almacena direcciones asociadas a diferentes entidades (polimórfico).

```sql
CREATE TABLE addresses (
  address_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL,
  entity_type VARCHAR NOT NULL,
  line1 VARCHAR NOT NULL,
  line2 VARCHAR,
  city VARCHAR NOT NULL,
  state_code VARCHAR(2) NOT NULL,
  postal_code VARCHAR NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_entity_type CHECK (entity_type IN ('user', 'property', 'borrower', 'lender'))
);

-- Índices
CREATE INDEX idx_addresses_entity ON addresses(entity_id, entity_type);
CREATE INDEX idx_addresses_city_state ON addresses(city, state_code);
```

### 5. Mortgages

Almacena información sobre hipotecas asociadas a propiedades.

```sql
CREATE TABLE mortgages (
  mortgage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
  loan_amount NUMERIC(14, 2) NOT NULL,
  interest_rate NUMERIC(5, 3) NOT NULL,
  term_years INTEGER NOT NULL,
  monthly_payment NUMERIC(10, 2),
  yearly_property_taxes NUMERIC(10, 2),
  yearly_insurance NUMERIC(10, 2),
  first_payment_date DATE,
  compound_period VARCHAR DEFAULT 'monthly',
  payment_frequency VARCHAR DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_compound_period CHECK (compound_period IN ('monthly', 'biweekly', 'weekly')),
  CONSTRAINT chk_payment_frequency CHECK (payment_frequency IN ('monthly', 'biweekly', 'weekly'))
);

-- Índices
CREATE INDEX idx_mortgages_property ON mortgages(property_id);
```

### 6. Persons

Almacena información sobre personas relacionadas con el negocio (prestamistas/prestatarios).

```sql
CREATE TABLE persons (
  person_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind VARCHAR NOT NULL,
  full_name VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  primary_email VARCHAR,
  primary_phone VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_person_kind CHECK (kind IN ('borrower', 'lender'))
);

-- Índices
CREATE INDEX idx_persons_kind ON persons(kind);
CREATE INDEX idx_persons_name ON persons(full_name, first_name, last_name);
```

### 7. Tenants

Almacena información sobre inquilinos asociados a propiedades.

```sql
CREATE TABLE tenants (
  tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(property_id) ON DELETE SET NULL,
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  lease_start DATE,
  lease_end DATE,
  rent_amount NUMERIC(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT chk_lease_dates CHECK (lease_end >= lease_start)
);

-- Índices
CREATE INDEX idx_tenants_property ON tenants(property_id);
```

## Políticas de Seguridad (RLS)

Supabase utiliza Row-Level Security (RLS) para controlar el acceso a los datos. Aquí se muestran las políticas recomendadas:

### Políticas para Profiles

```sql
-- Usuarios pueden ver y editar solo su propio perfil
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = user_id);
```

### Políticas para Properties

```sql
-- Usuarios pueden ver y gestionar solo sus propias propiedades
CREATE POLICY "Users can view their own properties" 
  ON properties FOR SELECT 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own properties" 
  ON properties FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own properties" 
  ON properties FOR UPDATE 
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own properties" 
  ON properties FOR DELETE 
  USING (auth.uid() = owner_id);
```

### Políticas para Addresses

```sql
-- Para direcciones de usuarios
CREATE POLICY "Users can manage their own addresses" 
  ON addresses FOR ALL 
  USING (
    (entity_type = 'user' AND entity_id = auth.uid()) OR
    (entity_type = 'property' AND entity_id IN (
      SELECT property_id FROM properties WHERE owner_id = auth.uid()
    ))
  );
```

## Notas de Implementación

1. **Transacciones**: Utilizar transacciones para operaciones que afectan a múltiples tablas (por ejemplo, crear una propiedad y su dirección).

2. **Validaciones**: Implementar validaciones tanto en el cliente como en el servidor para garantizar la integridad de los datos.

3. **Campos Calculados**: Considerar el uso de funciones o vistas para campos calculados como flujo de caja, ROI, etc.

4. **Índices**: Los índices mencionados son sugerencias iniciales. Ajustar basándose en patrones de consulta reales.

5. **Polimorfismo**: La tabla `addresses` utiliza un patrón polimórfico. Asegurarse de validar correctamente los tipos de entidades.

6. **Discriminador**: La tabla `persons` utiliza un discriminador `kind`. Validar campos requeridos según el tipo.