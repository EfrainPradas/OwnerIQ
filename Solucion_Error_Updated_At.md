# Solución de Errores en la Integración con la Base de Datos

## Problema 1: Campo `updated_at` inexistente

El código de la aplicación estaba intentando utilizar un campo `updated_at` en las tablas `person` y `person_address`, pero este campo no existe en el esquema de la base de datos. Esto generaba el siguiente error:

```
Error updating person profile: {code: 'PGRST204', details: null, hint: null, message: "Could not find the 'updated_at' column of 'person' in the schema cache"}
```

## Problema 2: Valor inválido para el enum `person_kind`

Después de solucionar el primer error, apareció un segundo error relacionado con el valor del campo `kind` en la tabla `person`:

```
Error updating person profile: {code: '22P02', details: null, hint: null, message: 'invalid input value for enum person_kind: "user"'}
```

Este error ocurre porque el campo `kind` en la tabla `person` es un enum que solo acepta los valores 'individual' u 'organization', pero el código estaba intentando usar el valor 'user'.

## Soluciones Implementadas

### Solución al Problema 1: Eliminar referencias a `updated_at`

Se han realizado las siguientes modificaciones en el archivo `App.js`:

1. En la función `handleProfileUpdate` (línea ~3665):
   ```javascript
   // Antes
   const { error: profileError } = await supabase
     .from('person')
     .upsert({
       person_id: user.id,
       full_name: profile.full_name,
       primary_email: profile.primary_email,
       primary_phone: profile.primary_phone,
       kind: 'user',
       updated_at: new Date().toISOString() // Campo problemático
     });

   // Después (primer cambio)
   const { error: profileError } = await supabase
     .from('person')
     .upsert({
       person_id: user.id,
       full_name: profile.full_name,
       primary_email: profile.primary_email,
       primary_phone: profile.primary_phone,
       kind: 'user'
       // Se eliminó el campo updated_at
     });
   ```

2. En la función `handleAddressSubmit` (actualización de dirección, línea ~3698):
   ```javascript
   // Antes
   const { error } = await supabase
     .from('person_address')
     .update({
       ...newAddress,
       updated_at: new Date().toISOString() // Campo problemático
     })
     .eq('address_id', editingAddressId);

   // Después
   const { error } = await supabase
     .from('person_address')
     .update({
       ...newAddress
       // Se eliminó el campo updated_at
     })
     .eq('address_id', editingAddressId);
   ```

3. En la función `handleAddressSubmit` (creación de dirección, línea ~3725):
   ```javascript
   // Antes
   const { error } = await supabase
     .from('person_address')
     .insert({
       person_id: user.id,
       ...newAddress,
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString() // Campo problemático
     });

   // Después
   const { error } = await supabase
     .from('person_address')
     .insert({
       person_id: user.id,
       ...newAddress,
       created_at: new Date().toISOString()
       // Se eliminó el campo updated_at
     });
   ```

### Solución al Problema 2: Corregir el valor del enum `person_kind`

Después de eliminar el campo `updated_at`, se encontró un segundo error relacionado con el valor del enum `kind`. En el esquema SQL, este campo solo acepta los valores 'individual' u 'organization', pero el código estaba utilizando 'user'.

Se modificó el código en la función `handleProfileUpdate`:

```javascript
// Antes (después del primer cambio)
const { error: profileError } = await supabase
  .from('person')
  .upsert({
    person_id: user.id,
    full_name: profile.full_name,
    primary_email: profile.primary_email,
    primary_phone: profile.primary_phone,
    kind: 'user'
  });

// Después (solución final)
const { error: profileError } = await supabase
  .from('person')
  .upsert({
    person_id: user.id,
    full_name: profile.full_name,
    primary_email: profile.primary_email,
    primary_phone: profile.primary_phone,
    kind: 'individual'
  });
```

## Instrucciones de Verificación

Para verificar que las soluciones se han implementado correctamente:

1. **Actualizar Perfil**:
   - Inicia sesión en la aplicación
   - Ve a la sección "Settings" (Configuración)
   - En la pestaña "User Profile" (Perfil de Usuario), modifica algún dato como el nombre completo o teléfono
   - Haz clic en "Save Changes" (Guardar cambios)
   - Verifica que no aparezca ningún mensaje de error
   - Recarga la página y comprueba que los cambios se hayan guardado correctamente

2. **Crear Dirección**:
   - En la misma sección de perfil, haz clic en "Add Address" (Añadir dirección)
   - Completa el formulario con datos de prueba
   - Haz clic en "Add Address" (Añadir dirección)
   - Verifica que no aparezca ningún mensaje de error
   - Comprueba que la dirección aparezca en la lista

3. **Actualizar Dirección**:
   - En la lista de direcciones, haz clic en "Edit" (Editar) en una de ellas
   - Modifica algún dato
   - Haz clic en "Update Address" (Actualizar dirección)
   - Verifica que no aparezca ningún mensaje de error
   - Comprueba que los cambios se hayan guardado correctamente

4. **Verificar el Valor del Campo `kind`**:
   - Desde la consola de administración de la base de datos, ejecuta una consulta SELECT para ver los registros de la tabla `person`:
   ```sql
   SELECT * FROM person WHERE person_id = 'el-id-del-usuario-de-prueba';
   ```
   - Verifica que el campo `kind` tenga el valor 'individual' y no 'user'

## Análisis de los Problemas

### Análisis del Problema 1: Campo `updated_at` inexistente

El primer error se producía porque el código estaba asumiendo la existencia de un campo `updated_at` en las tablas `person` y `person_address`, pero este campo no está definido en el esquema de la base de datos.

Es común que los frameworks ORM (Object-Relational Mapping) utilicen campos como `created_at` y `updated_at` para realizar un seguimiento automático de cuándo se crearon o actualizaron los registros. Sin embargo, en este caso, el esquema de la base de datos solo incluía el campo `created_at`.

La solución ha consistido en eliminar todas las referencias al campo `updated_at` en las operaciones de upsert e insert.

### Análisis del Problema 2: Valor inválido para enum

El segundo error se debía a una discrepancia entre el valor que se estaba utilizando en el código ('user') y los valores realmente permitidos para el campo `kind` en la tabla `person` ('individual' u 'organization').

En el esquema SQL, este campo está definido como un enum de la siguiente manera:

```sql
CREATE TYPE person_kind AS ENUM ('individual','organization');
```

Sin embargo, en el código se estaba utilizando el valor 'user' que no es parte del enum, lo que causaba el error:

```
invalid input value for enum person_kind: "user"
```

La solución ha consistido en cambiar el valor a 'individual', que es el que mejor se adapta para representar a los usuarios de la aplicación.

## Recomendaciones Adicionales

Para futuros desarrollos:

1. **Consistencia en el esquema**: Considerar añadir el campo `updated_at` al esquema de la base de datos para todas las tablas, lo que facilitaría el seguimiento de las actualizaciones.

2. **Validación de campos**: Implementar una capa de validación que verifique los campos y sus tipos antes de realizar operaciones en la base de datos.

3. **Abstracción de operaciones de base de datos**: Crear funciones de ayuda que manejen automáticamente los campos comunes como `created_at` y `updated_at`, adaptándose al esquema existente.

4. **Documentación de enums**: Mantener una documentación actualizada de los posibles valores para campos enum y asegurarse de que todo el equipo de desarrollo esté al tanto de estos valores.

5. **Adaptadores para manejo de discriminadores**: Implementar adaptadores para manejar los diferentes tipos de personas en la tabla `person` utilizando el discriminador `kind` correctamente.

## Verificación del Modelo de Datos (ERD)

Se ha creado un diagrama ERD (Entity-Relationship Diagram) actualizado que representa correctamente la estructura actual de la base de datos. Este diagrama muestra claramente:

- Las tablas `person` y `person_address` solo tienen el campo `created_at` y no `updated_at`
- El campo `kind` en la tabla `person` es un enum con valores 'individual' y 'organization'

Consulta el archivo `ERD_visual_simplificado.md` para ver el diagrama completo.