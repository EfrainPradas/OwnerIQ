-- Script simple para corregir el propietario de la propiedad
-- Ejecutar en Supabase SQL Editor o psql

-- 1. Ver propiedades existentes
SELECT property_id, person_id, address FROM property;

-- 2. Ver usuarios existentes en person
SELECT person_id, full_name, primary_email FROM person;

-- 3. Actualizar la propiedad para que pertenezca al usuario correcto
-- Reemplaza 'TU_USER_ID' con el ID que aparece en los logs del backend
-- (normalmente es el mismo que user.id de Supabase Auth)

UPDATE property
SET person_id = 'db731feb-cbf5-40ae-916e-4ce20f23d70e'
WHERE property_id = '21733268-7f01-4e03-9303-f9c592c19419';

-- 4. Verificar la actualización
SELECT property_id, person_id, address FROM property WHERE property_id = '21733268-7f01-4e03-9303-f9c592c19419';