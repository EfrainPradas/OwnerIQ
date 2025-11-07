# Problema de Integración con la Base de Datos en OwnerIQ

Este documento detalla un problema específico encontrado en la integración con la base de datos y propone una solución.

## Identificación del Problema

Durante el desarrollo de la aplicación OwnerIQ, se identificó una discrepancia entre los nombres de tablas utilizados en el código de la aplicación y los nombres reales de las tablas en la base de datos. Específicamente:

1. **Inconsistencia en nombres de tablas**:
   - En el código frontend, particularmente en `ProfileView.jsx`, se hace referencia a la tabla `profiles` para almacenar la información del perfil de usuario.
   - Sin embargo, en la base de datos actual, esta información está almacenada en la tabla `person` con un discriminador `kind` para diferenciar entre diferentes tipos de personas.

2. **Problemas en las consultas**:
   - Las consultas realizadas a `profiles` fallan porque la tabla no existe o tiene una estructura diferente.
   - Las consultas a `person` requieren filtrado adicional por el campo `kind`.

3. **Impacto en la funcionalidad**:
   - Los usuarios no pueden actualizar correctamente su información de perfil.
   - Las direcciones no se asocian correctamente con los perfiles.
   - La información de contacto no se recupera adecuadamente en varias partes de la aplicación.

## Causa Raíz

La discrepancia se debe a cambios en el esquema de la base de datos durante el desarrollo:

1. **Diseño inicial**: Originalmente, el sistema utilizaba tablas separadas para diferentes tipos de entidades (users, profiles, borrowers, lenders).

2. **Refactorización**: Posteriormente, se refactorizó el esquema para utilizar un enfoque más flexible con tablas polimórficas:
   - Se creó una tabla `person` con un campo discriminador `kind`.
   - Se adoptó un patrón similar para las direcciones con una tabla `addresses` y campos `entity_id` y `entity_type`.

3. **Desalineación**: El código de la aplicación no fue completamente actualizado para reflejar estos cambios, resultando en consultas a tablas que ya no existen en su forma original.

## Solución Propuesta

Para resolver este problema, se proponen las siguientes acciones:

### 1. Enfoque de Adaptador para Consultas

Implementar una capa de adaptador en el frontend que:

```javascript
// Función adaptadora para consultas de perfil
async function fetchUserProfile(userId) {
  // Intenta primero con la tabla 'profiles'
  let { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  // Si falla, intenta con la tabla 'person' filtrando por kind = 'user'
  if (error || !data) {
    const { data: personData, error: personError } = await supabase
      .from('person')
      .select('*')
      .eq('user_id', userId)
      .eq('kind', 'user')
      .single();
      
    if (!personError && personData) {
      data = personData;
    }
  }
  
  return { data, error };
}
```

### 2. Actualización de Componentes Relevantes

Modificar los componentes relevantes, específicamente:

- `ProfileView.jsx`: Utilizar la función adaptadora para obtener y actualizar perfiles.
- `SettingsView.jsx`: Asegurar que las actualizaciones de perfil sean consistentes.
- Cualquier otro componente que interactúe directamente con estas tablas.

### 3. Normalización a Largo Plazo

Como solución a largo plazo:

1. **Normalizar el esquema**: 
   - Definir claramente si se utilizará `profiles` o `person` para los perfiles de usuario.
   - Actualizar todas las consultas en la aplicación para usar el esquema normalizado.

2. **Migración de datos**:
   - Crear una migración para transferir datos entre las tablas si es necesario.
   - Asegurarse de que no se pierda información durante la migración.

3. **Documentación**:
   - Actualizar la documentación del ERD y del esquema para reflejar la estructura actual.
   - Clarificar la relación entre `users`, `profiles`, y `person`.

## Implementación Inmediata

Como solución inmediata, se implementará el enfoque de adaptador en las funciones clave que interactúan con perfiles:

1. `fetchProfileData()`
2. `handleProfileUpdate()`
3. `handleAddressSubmit()`

Estas funciones se modificarán para intentar operaciones en ambas tablas (`profiles` y `person`), priorizando la tabla especificada en la configuración pero con un fallback a la alternativa.

## Conclusión

Esta discrepancia ilustra la importancia de mantener sincronizados el código de la aplicación y el esquema de la base de datos durante el desarrollo. La solución propuesta proporciona tanto una corrección inmediata como un camino hacia una arquitectura más consistente en el futuro.