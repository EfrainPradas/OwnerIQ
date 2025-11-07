BEGIN;

-- Rename legacy enum and column for legal type, if they exist
DO $$
BEGIN
  ALTER TYPE person_kind RENAME TO person_legal_type;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE person_legal_type ADD VALUE IF NOT EXISTS 'individual';
  ALTER TYPE person_legal_type ADD VALUE IF NOT EXISTS 'organization';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'person' AND column_name = 'legal_type'
  ) THEN
    ALTER TABLE person RENAME COLUMN kind TO legal_type;
  END IF;
END $$;

ALTER TABLE person
  ALTER COLUMN legal_type SET DEFAULT 'individual';

-- Enums for status and verifications
DO $$ BEGIN
  CREATE TYPE person_status AS ENUM ('active','prospect','former');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contact_verification_status AS ENUM ('pending','verified','invalid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE address_verification_status AS ENUM ('pending','verified','undeliverable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE person_role_kind AS ENUM ('tenant','lender','investor_contact','advisor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tenancy_status AS ENUM ('draft','active','delinquent','ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tenancy_party_role AS ENUM ('primary','co-tenant','guarantor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE person_document_kind AS ENUM ('w9','lease_agreement','id_document','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend person table with richer metadata
ALTER TABLE person
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS status person_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS notes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid;

UPDATE person SET status = 'active' WHERE status IS NULL;
UPDATE person SET notes = '{}'::jsonb WHERE notes IS NULL;

-- Person contact enhancements
ALTER TABLE person_contact
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS verification_status contact_verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Person address enhancements
ALTER TABLE person_address
  ADD COLUMN IF NOT EXISTS valid_from date,
  ADD COLUMN IF NOT EXISTS valid_to date,
  ADD COLUMN IF NOT EXISTS verification_status address_verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE person_address
SET valid_from = CURRENT_DATE
WHERE valid_from IS NULL;

-- Role table per person, scoped to portfolio owner
CREATE TABLE IF NOT EXISTS person_role (
  person_role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  owner_person_id uuid REFERENCES person(person_id) ON DELETE CASCADE,
  role person_role_kind NOT NULL,
  context text NOT NULL DEFAULT 'global',
  context_id uuid,
  active_from date NOT NULL DEFAULT CURRENT_DATE,
  active_to date,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'person_role'
      AND column_name = 'person_id'
  ) THEN
    ALTER TABLE person_role
      ADD COLUMN person_id uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'person_role'
      AND column_name = 'person_id'
  ) THEN
    UPDATE person_role
    SET person_id = owner_person_id
    WHERE person_id IS NULL
      AND owner_person_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE c.conname = 'person_role_person_id_fkey'
      AND rel.relname = 'person_role'
      AND nsp.nspname = 'public'
  ) THEN
    ALTER TABLE person_role
      ADD CONSTRAINT person_role_person_id_fkey
      FOREIGN KEY (person_id) REFERENCES person(person_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM person_role
    WHERE person_id IS NULL
  ) THEN
    ALTER TABLE person_role
      ALTER COLUMN person_id SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_person_role_unique_active
  ON person_role (person_id, owner_person_id, role, context, context_id)
  WHERE active_to IS NULL;

-- Tenancy tables normalized
CREATE TABLE IF NOT EXISTS property_tenancy (
  tenancy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES property(property_id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  lease_start date,
  lease_end date,
  rent_amount numeric(12,2),
  status tenancy_status NOT NULL DEFAULT 'draft',
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_tenancy_dates CHECK (lease_end IS NULL OR lease_start IS NULL OR lease_end >= lease_start)
);

CREATE INDEX IF NOT EXISTS idx_property_tenancy_person ON property_tenancy (person_id);
CREATE INDEX IF NOT EXISTS idx_property_tenancy_property ON property_tenancy (property_id);

CREATE TABLE IF NOT EXISTS property_tenancy_party (
  tenancy_party_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES property_tenancy(tenancy_id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  role tenancy_party_role NOT NULL,
  UNIQUE (tenancy_id, person_id, role)
);

-- Person documents to track compliance artefacts
CREATE TABLE IF NOT EXISTS person_document (
  document_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
  tenancy_id uuid REFERENCES property_tenancy(tenancy_id) ON DELETE CASCADE,
  kind person_document_kind NOT NULL,
  storage_path text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  expires_at date,
  verified_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Helpful unique constraints / indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_person_contact_primary
  ON person_contact (person_id, kind)
  WHERE is_primary;

CREATE UNIQUE INDEX IF NOT EXISTS uq_person_contact_email_unique
  ON person_contact (lower(value))
  WHERE kind = 'email';

CREATE UNIQUE INDEX IF NOT EXISTS uq_person_address_primary
  ON person_address (person_id, kind)
  WHERE is_primary;

COMMIT;
