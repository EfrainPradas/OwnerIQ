# Solución: Error de Tabla 'profiles' No Encontrada

## Error Detectado

```
POST https://zapanqzqloibnbsvkbob.supabase.co/rest/v1/profiles 404 (Not Found)

Error updating profile: {
  code: 'PGRST205', 
  details: null, 
  hint: "Perhaps you meant the table 'public.funding_profile'", 
  message: "Could not find the table 'public.profiles' in the schema cache"
}
```

Este error ocurre cuando el frontend intenta interactuar con una tabla llamada `profiles` que no existe en la base de datos Supabase. La sugerencia del error indica que posiblemente existe una tabla similar llamada `funding_profile`.

## Análisis del Problema

Este es un ejemplo perfecto del desafío de "Adaptación a Diferentes Convenciones de Nombrado" que identifiqué en el documento `Desafios_Integracion_BD.md`. La aplicación frontend está intentando acceder a una tabla con un nombre que no coincide con la estructura actual de la base de datos.

## Solución Propuesta

### 1. Modificación del Código de Perfil

Actualizar el método `handleProfileUpdate` en `App.js` para que intente primero con `profiles` y si falla, use `funding_profile`:

```javascript
const handleProfileUpdate = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setSuccessMessage('');
  setErrorMessage('');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Actualizar metadatos de autenticación (igual que antes)
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          phone: profile.primary_phone
        }
      });
      
      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        setErrorMessage('Error updating profile metadata');
        return;
      }
      
      // Verificar qué tabla existe e insertar en la correcta
      let profileTable = 'profiles';
      let profileError;
      
      // Intentar con 'profiles' primero
      const { error: error1 } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.full_name,
          primary_email: profile.primary_email,
          primary_phone: profile.primary_phone,
          updated_at: new Date().toISOString()
        });
      
      if (error1 && error1.code === 'PGRST205') {
        // Si 'profiles' no existe, intentar con 'funding_profile'
        console.log("Table 'profiles' not found, trying 'funding_profile'");
        profileTable = 'funding_profile';
        
        const { error: error2 } = await supabase
          .from('funding_profile')
          .upsert({
            user_id: user.id,
            full_name: profile.full_name,
            primary_email: profile.primary_email,
            primary_phone: profile.primary_phone,
            updated_at: new Date().toISOString()
          });
          
        profileError = error2;
      } else {
        profileError = error1;
      }
      
      if (profileError) {
        console.error(`Error updating profile in ${profileTable}:`, profileError);
        setErrorMessage(`Error updating profile information in ${profileTable}`);
      } else {
        setSuccessMessage(`Profile updated successfully in ${profileTable}`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    setErrorMessage('Error updating profile');
  } finally {
    setIsSubmitting(false);
  }
};
```

### 2. Solución Más Robusta: Implementación de Capa de Abstracción

Para una solución más general que funcione en toda la aplicación, podemos implementar la capa de abstracción para consultas que sugerí en el documento `Desafios_Integracion_BD.md`:

```javascript
// En un archivo utils/db.js
const tableMapping = {
  profiles: ['profiles', 'funding_profile', 'person'],
  addresses: ['addresses', 'person_address'],
  properties: ['properties', 'real_estate']
};

export const adaptiveUpsert = async (tableName, data) => {
  // Intentar con cada variante del nombre de tabla
  for (const table of tableMapping[tableName] || [tableName]) {
    try {
      const { data: result, error } = await supabase
        .from(table)
        .upsert(data);
        
      // Si no hay error, retornar resultado
      if (!error) {
        return { data: result, table, error: null };
      } else if (error.code !== 'PGRST205') {
        // Si el error no es "tabla no encontrada", también retornar
        return { data: null, table, error };
      }
      // Si es "tabla no encontrada", continuar con la siguiente variante
    } catch (e) {
      continue;
    }
  }
  
  return { 
    data: null, 
    table: null, 
    error: 'No matching table found among alternatives: ' + 
           (tableMapping[tableName] || [tableName]).join(', ')
  };
};

// Función para obtener datos con nombres de tabla alternativos
export const adaptiveFetch = async (tableName, query = {}) => {
  for (const table of tableMapping[tableName] || [tableName]) {
    try {
      let supabaseQuery = supabase.from(table).select('*');
      
      // Aplicar condiciones si existen
      if (query.eq) {
        Object.entries(query.eq).forEach(([key, value]) => {
          supabaseQuery = supabaseQuery.eq(key, value);
        });
      }
      
      const { data, error } = await supabaseQuery;
      
      if (!error) {
        return { data, table, error: null };
      } else if (error.code !== 'PGRST205') {
        return { data: null, table, error };
      }
    } catch (e) {
      continue;
    }
  }
  
  return { 
    data: null, 
    table: null, 
    error: 'No matching table found among alternatives: ' + 
           (tableMapping[tableName] || [tableName]).join(', ')
  };
};
```

### 3. Actualización del método `fetchProfileData`

```javascript
const fetchProfileData = async () => {
  setIsLoading(true);
  try {
    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Obtener datos de perfil usando la función adaptativa
      const { data: profileData, table: profileTable, error: profileError } = 
        await adaptiveFetch('profiles', { 
          eq: { user_id: user.id } 
        });
        
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setErrorMessage('Error loading profile data');
      } else {
        console.log(`Profile data retrieved from table: ${profileTable}`);
        setProfile(profileData?.[0] || {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || '',
          primary_email: user.email,
          primary_phone: user.user_metadata?.phone || ''
        });
      }
      
      // Obtener direcciones con la misma técnica
      const { data: addressData, table: addressTable, error: addressError } =
        await adaptiveFetch('addresses', {
          eq: { 
            entity_id: user.id,
            entity_type: 'user'
          }
        });
        
      if (addressError) {
        console.error('Error fetching addresses:', addressError);
        setErrorMessage('Error loading address data');
      } else {
        console.log(`Address data retrieved from table: ${addressTable}`);
        setAddresses(addressData || []);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    setErrorMessage('Error loading profile data');
    
    // Datos simulados para desarrollo (como antes)
    setProfile({
      full_name: 'Demo User',
      primary_email: 'user@example.com',
      primary_phone: '555-123-4567'
    });
    
    setAddresses([
      {
        address_id: 'mock-1',
        line1: '123 Main St',
        city: 'New York',
        state_code: 'NY',
        postal_code: '10001',
        is_primary: true
      }
    ]);
  } finally {
    setIsLoading(false);
  }
};
```

## Paso a Paso para Implementar la Solución

1. **Solución Rápida**: Modifica directamente el método `handleProfileUpdate` en `App.js` como se muestra en la primera solución.

2. **Solución Completa**:
   - Crea un nuevo archivo `utils/db.js` con las funciones adaptativas
   - Importa estas funciones en `App.js`
   - Actualiza los métodos `fetchProfileData`, `handleProfileUpdate` y `handleAddressSubmit` para usar estas funciones
   - Prueba la funcionalidad para verificar que se resuelva el error

3. **Solución Permanente**:
   - Una vez identificada la tabla correcta, actualiza el código para usar el nombre correcto directamente
   - O considera crear una vista en Supabase con el nombre esperado que redireccione a la tabla real

## Beneficios de esta Solución

1. **Manejo de errores robusto**: La aplicación continuará funcionando incluso con diferencias en los nombres de tablas
2. **Transparencia**: Logs en la consola indicarán qué tabla se está usando realmente
3. **Escalabilidad**: El sistema se adaptará automáticamente a cambios futuros en la estructura de la base de datos
4. **Consistencia**: La experiencia del usuario permanece intacta a pesar de las inconsistencias en el backend

Esta solución es un ejemplo práctico de los principios discutidos en la documentación ERD, demostrando cómo implementar un sistema resiliente que pueda adaptarse a variaciones en la estructura de la base de datos.