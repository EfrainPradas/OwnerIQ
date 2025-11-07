-- Simplified schema for OwnerIQ MVP

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE person_kind AS ENUM ('individual','organization');

CREATE TYPE property_type AS ENUM ('single_family','townhouse','condo','multi_family','commercial');

CREATE TABLE person (
  person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind person_kind NOT NULL DEFAULT 'individual',
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  primary_email TEXT UNIQUE,
  primary_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE property (
  property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES person(person_id) ON DELETE CASCADE,
  address TEXT,
  valuation NUMERIC(14,2),
  rent NUMERIC(10,2),
  taxes NUMERIC(10,2),
  insurance NUMERIC(10,2),
  hoa NUMERIC(10,2),
  maintenance NUMERIC(5,2),
  vacancy NUMERIC(5,2),
  loan_rate NUMERIC(5,2),
  loan_term INT,
  ltv NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant (
  tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES person(person_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  property_id UUID REFERENCES property(property_id) ON DELETE SET NULL,
  lease_start DATE,
  lease_end DATE,
  rent_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed example person
INSERT INTO person (full_name, first_name, last_name, primary_email, primary_phone)
VALUES ('John Doe','John','Doe','john@example.com','+1-555-123-4567')
ON CONFLICT (primary_email) DO NOTHING;