# Solución al Error de Restricción de Clave Foránea

## Problema Identificado

Cuando se intentaba crear una nueva propiedad, se producía el siguiente error:

```
Error insertando en property: insert or update on table "property" violates foreign key constraint "property_person_id_fkey"
```

Este error indica que la base de datos está rechazando la inserción porque el `person_id` que estamos utilizando no existe en la tabla `person`. Esto ocurre específicamente cuando se utiliza la aplicación en modo demostración, donde el usuario tiene un ID temporal (`dummy-id`).

## Causa del Problema

En la implementación original, intentábamos usar un UUID placeholder fijo para los usuarios de demostración:

```javascript
const personId = req.user.id === 'dummy-id'
  ? '00000000-0000-0000-0000-000000000000' // placeholder UUID for demo purposes
  : req.user.id;
```

Sin embargo, este UUID placeholder no existía en la tabla `person`, lo que violaba la restricción de clave foránea.

## Solución Implementada

He implementado una solución que verifica si existe un registro de persona para demostración y, si no existe, lo crea automáticamente:

```javascript
let personId = req.user.id;

if (req.user.id === 'dummy-id') {
  // Verificar si existe una persona demo
  console.log("Usuario dummy, verificando si existe persona demo...");
  
  const { data: existingDemo, error: demoError } = await supabase
    .from('person')
    .select('person_id')
    .eq('primary_email', 'demo@example.com')
    .single();
  
  if (demoError || !existingDemo) {
    console.log("No se encontró persona demo, creando una nueva...");
    
    // Crear una persona demo si no existe
    const { data: newPerson, error: createError } = await supabase
      .from('person')
      .insert({
        full_name: 'Demo User',
        primary_email: 'demo@example.com',
        kind: 'individual'
      })
      .select();
    
    if (createError) {
      console.error("Error creando persona demo:", createError.message);
      return res.status(400).json({ 
        error: 'Error creando usuario para demostración', 
        details: createError.message,
        success: false 
      });
    }
    
    personId = newPerson[0].person_id;
    console.log("Nueva persona demo creada con ID:", personId);
  } else {
    personId = existingDemo.person_id;
    console.log("Usando persona demo existente con ID:", personId);
  }
}
```

## Cómo Funciona la Solución

1. Si el usuario es un usuario de demostración (`dummy-id`), el sistema busca en la base de datos una persona existente con el correo `demo@example.com`.

2. Si no encuentra una persona demo:
   - Crea una nueva entrada en la tabla `person` con los datos básicos para un usuario de demostración.
   - Usa el ID de la nueva persona para la propiedad.

3. Si ya existe una persona demo:
   - Utiliza el ID de esa persona existente.

4. De esta manera, siempre tenemos un ID de persona válido que existe en la tabla `person`, lo que satisface la restricción de clave foránea.

## Beneficios Adicionales

1. **Persistencia**: Ahora todas las propiedades creadas en modo demostración pertenecen a la misma persona demo, lo que facilita su gestión y visualización.

2. **Consistencia**: Se mantiene la integridad referencial de la base de datos.

3. **Experiencia de Usuario**: Los usuarios de demostración pueden utilizar todas las funcionalidades sin errores relacionados con las claves foráneas.

## Verificación

Para verificar que esta solución funciona correctamente:

1. Iniciar sesión en la aplicación en modo demostración (o sin iniciar sesión, dependiendo de cómo esté configurada la aplicación).

2. Crear una nueva propiedad con todos los datos requeridos.

3. Confirmar que no aparecen errores y que la propiedad se guarda correctamente.

4. Utilizar la herramienta de diagnóstico (frontend/debug.html) para verificar que todos los datos se han guardado correctamente en las tablas relacionadas.