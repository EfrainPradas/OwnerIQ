-- Script para corregir el propietario de la propiedad demo
-- Cambia el person_id de la propiedad para que pertenezca al usuario autenticado

-- Primero, verifica qué usuarios existen en la tabla person
SELECT person_id, full_name, primary_email FROM person;

-- Actualiza la propiedad para que pertenezca al usuario autenticado
-- Reemplaza 'TU_USER_ID_AQUI' con el ID real del usuario autenticado
-- (normalmente es el mismo que el user.id de Supabase Auth)

UPDATE property
SET person_id = 'db731feb-cbf5-40ae-916e-4ce20f23d70e'  -- ID del usuario autenticado
WHERE property_id = '21733268-7f01-4e03-9303-f9c592c19419';

-- Verifica que la actualización fue exitosa
SELECT property_id, person_id, address FROM property WHERE property_id = '21733268-7f01-4e03-9303-f9c592c19419';