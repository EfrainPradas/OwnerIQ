# Instrucciones para Corregir el Problema de Actualización de Direcciones

## Problema Identificado

Se ha detectado que al actualizar el perfil de usuario, la tabla `person` se actualiza correctamente, pero hay problemas con la actualización de direcciones en la tabla `person_address`. 

Análisis del problema:
1. El código en `handleAddressSubmit()` (App.js líneas 3683-3772) intenta gestionar un campo `is_primary` en la tabla `person_address`.
2. La revisión del esquema (schema.sql) muestra que este campo no existe en la definición de la tabla.
3. Adicionalmente, el código utiliza `kind: 'user'` al actualizar la tabla `person`, pero el enum `person_kind` solo acepta 'individual' u 'organization'.

## Solución Propuesta

### 1. Modificar el Esquema de la Base de Datos

Ejecutar el siguiente script SQL en la consola SQL de Supabase:

```sql
-- Agregar el campo is_primary a la tabla person_address
ALTER TABLE person_address ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE;

-- Crear un índice único para asegurar que solo una dirección puede ser primaria por persona
CREATE UNIQUE INDEX IF NOT EXISTS u_person_primary_address
  ON person_address(person_id) WHERE is_primary;
```

### 2. Modificar el Código en App.js

#### Corrección en handleProfileUpdate() (líneas 3632-3681)

Cambiar:
```javascript
kind: 'user'
```

Por:
```javascript
kind: 'individual'
```

El código corregido debería quedar así:

```javascript
// Check if profile exists and upsert to person table
const { error: profileError } = await supabase
  .from('person')
  .upsert({
    person_id: user.id,
    full_name: profile.full_name,
    primary_email: profile.primary_email,
    primary_phone: profile.primary_phone,
    kind: 'individual'  // Cambiado de 'user' a 'individual'
  });
```

### 3. Verificar la Implementación

1. Después de aplicar estos cambios, se recomienda probar la funcionalidad de actualización de direcciones:
   - Iniciar sesión en la aplicación
   - Ir a la sección de perfil
   - Añadir una nueva dirección o editar una existente
   - Verificar que se guarda correctamente y que la opción "dirección principal" funciona

2. Revisar los logs de la consola del navegador y del servidor para asegurarse de que no hay errores relacionados con las tablas `person` o `person_address`.

## Explicación Técnica

La solución aborda dos problemas distintos:

1. **Incompatibilidad de campo**: El frontend usa un campo `is_primary` en `person_address` que no existía en la base de datos. Al añadir este campo, permitimos que la lógica de "dirección principal" funcione correctamente.

2. **Incompatibilidad de enum**: El código usaba el valor 'user' para el campo `kind` en la tabla `person`, pero el tipo enum `person_kind` solo acepta 'individual' u 'organization'. Al cambiar el valor a 'individual', nos aseguramos de que las operaciones de actualización funcionen correctamente.

Estos cambios mantienen la integridad de datos y permiten que la aplicación funcione según lo esperado, sin necesidad de realizar cambios mayores en la lógica de la aplicación.