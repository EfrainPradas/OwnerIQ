-- Corrección del esquema para la tabla person_address
-- Problema: El código frontend utiliza un campo is_primary que no existe en el esquema actual

-- Agregar el campo is_primary a la tabla person_address
ALTER TABLE person_address ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE;

-- Crear un índice único para asegurar que solo una dirección puede ser primaria por persona
CREATE UNIQUE INDEX IF NOT EXISTS u_person_primary_address
  ON person_address(person_id) WHERE is_primary;

-- Nota: Esta modificación mantiene coherencia con la estructura de person_contact
-- que sí tiene este campo is_primary en el esquema original.

-- IMPORTANTE: Ejecutar este script en la base de datos Supabase para corregir
-- el problema de actualización de direcciones.