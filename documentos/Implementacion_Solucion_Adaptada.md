# Implementación de Solución Adaptada para Integración DB en OwnerIQ

Este documento proporciona una implementación adaptada específicamente para resolver los errores encontrados en las consultas a la base de datos.

## Errores Identificados

Analizando los logs de errores de la aplicación, se identifican los siguientes problemas específicos:

1. Error al consultar la tabla `profiles`:
```
Error fetching profile: {code: 'PGRST205', details: null, hint: "Perhaps you meant the table 'public.funding_profile'", message: "Could not find the table 'public.profiles' in the schema cache"}
```

2. Error al consultar la tabla `addresses`:
```
Error fetching addresses: {code: 'PGRST205', details: null, hint: "Perhaps you meant the table 'public.person_address'", message: "Could not find the table 'public.addresses' in the schema cache"}
```

## Solución Adaptada

Basándonos en los mensajes de error, necesitamos modificar la implementación del adaptador para que utilice las tablas correctas que existen en la base de datos.

### 1. Modificación del Adaptador de Perfiles

```javascript
import { supabase } from '../supabaseClient';

/**
 * Adaptador para consultas de perfiles que maneja diferentes nombres de tabla
 */
export const ProfileAdapter = {
  /**
   * Obtiene el perfil de un usuario con soporte para diferentes estructuras de tabla
   * @param {string} userId - ID del usuario
   * @returns {Promise<{data, error}>} - Datos del perfil o error
   */
  async fetchProfile(userId) {
    // Primera estrategia: tabla 'profiles'
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    // Si falla, intenta con tabla 'funding_profile'
    if (error && error.code === 'PGRST205') {
      console.log('Fallback: intentando tabla funding_profile', error);
      const { data: profileData, error: profileError } = await supabase
        .from('funding_profile')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (!profileError) {
        // Mapeo de campos si es necesario
        data = {
          user_id: profileData.user_id,
          full_name: profileData.full_name || `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
          primary_email: profileData.primary_email || profileData.email,
          primary_phone: profileData.primary_phone || profileData.phone,
          created_at: profileData.created_at,
          updated_at: profileData.updated_at
        };
        error = null;
        return { data, error };
      }
      
      // Si también falla, intenta con tabla 'person'
      console.log('Fallback: intentando tabla person', profileError);
      const { data: personData, error: personError } = await supabase
        .from('person')
        .select('*')
        .eq('user_id', userId)
        .eq('kind', 'user')
        .single();
        
      if (!personError) {
        // Mapeo de campos si es necesario
        data = {
          user_id: personData.user_id,
          full_name: personData.full_name || `${personData.first_name || ''} ${personData.last_name || ''}`.trim(),
          primary_email: personData.primary_email || personData.email,
          primary_phone: personData.primary_phone || personData.phone,
          created_at: personData.created_at,
          updated_at: personData.updated_at
        };
        error = null;
      }
    }
    
    return { data, error };
  },
  
  /**
   * Actualiza el perfil de un usuario con soporte para diferentes estructuras de tabla
   * @param {string} userId - ID del usuario
   * @param {object} profileData - Datos a actualizar
   * @returns {Promise<{data, error}>} - Resultado de la operación
   */
  async updateProfile(userId, profileData) {
    let allResults = [];
    let finalResult = { data: null, error: null };
    
    // Intenta escribir en todas las tablas posibles para mantener sincronización
    
    // 1. Intenta con tabla 'profiles'
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        });
      
      allResults.push({ table: 'profiles', success: !error, error });
      if (!error) finalResult = { data, error };
    } catch (e) {
      allResults.push({ table: 'profiles', success: false, error: e });
    }
    
    // 2. Intenta con tabla 'funding_profile'
    try {
      const { data, error } = await supabase
        .from('funding_profile')
        .upsert({
          user_id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        });
      
      allResults.push({ table: 'funding_profile', success: !error, error });
      if (!error && !finalResult.data) finalResult = { data, error };
    } catch (e) {
      allResults.push({ table: 'funding_profile', success: false, error: e });
    }
    
    // 3. Intenta con tabla 'person'
    try {
      // Verificar si existe el registro primero
      const { data: existingPerson } = await supabase
        .from('person')
        .select('person_id')
        .eq('user_id', userId)
        .eq('kind', 'user')
        .single();
      
      let personResult;
      
      if (existingPerson) {
        // Actualizar registro existente
        personResult = await supabase
          .from('person')
          .update({
            full_name: profileData.full_name,
            primary_email: profileData.primary_email,
            primary_phone: profileData.primary_phone,
            updated_at: new Date().toISOString()
          })
          .eq('person_id', existingPerson.person_id);
      } else {
        // Crear nuevo registro
        personResult = await supabase
          .from('person')
          .insert({
            user_id: userId,
            kind: 'user',
            full_name: profileData.full_name,
            primary_email: profileData.primary_email,
            primary_phone: profileData.primary_phone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
      
      allResults.push({ table: 'person', success: !personResult.error, error: personResult.error });
      if (!personResult.error && !finalResult.data) finalResult = personResult;
    } catch (e) {
      allResults.push({ table: 'person', success: false, error: e });
    }
    
    console.log('Resultados de actualización de perfil:', allResults);
    
    // Si todos fallaron, devuelve el primer error
    if (finalResult.error && allResults.every(r => !r.success)) {
      return { 
        data: null, 
        error: allResults[0].error,
        allResults 
      };
    }
    
    // Devuelve éxito si al menos una operación funcionó
    return finalResult;
  }
};

/**
 * Adaptador para consultas de direcciones que maneja diferentes estructuras
 */
export const AddressAdapter = {
  /**
   * Obtiene las direcciones de una entidad
   * @param {string} entityId - ID de la entidad
   * @param {string} entityType - Tipo de entidad ('user', 'property', etc.)
   * @returns {Promise<{data, error}>} - Lista de direcciones o error
   */
  async fetchAddresses(entityId, entityType) {
    // Primera estrategia: tabla 'addresses'
    let { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .order('is_primary', { ascending: false });
    
    // Si falla, intenta con tabla 'person_address'  
    if (error && error.code === 'PGRST205') {
      console.log('Fallback: intentando tabla person_address', error);
      
      // Mapeo de entity_type a los tipos posibles en person_address
      let personType;
      switch (entityType) {
        case 'user': personType = 'user'; break;
        case 'property': personType = 'property'; break;
        case 'borrower': personType = 'borrower'; break;
        case 'lender': personType = 'lender'; break;
        default: personType = entityType;
      }
      
      const { data: addressData, error: addressError } = await supabase
        .from('person_address')
        .select('*')
        .eq('person_id', entityId)
        .eq('person_type', personType)
        .order('is_primary', { ascending: false });
        
      if (!addressError) {
        // Mapeo de campos para mantener consistencia con la estructura esperada
        data = addressData.map(addr => ({
          address_id: addr.id || addr.address_id,
          entity_id: addr.person_id || addr.entity_id,
          entity_type: addr.person_type || addr.entity_type,
          line1: addr.line1 || addr.address_line1,
          line2: addr.line2 || addr.address_line2,
          city: addr.city,
          state_code: addr.state_code || addr.state,
          postal_code: addr.postal_code || addr.zip_code,
          is_primary: addr.is_primary || false,
          created_at: addr.created_at,
          updated_at: addr.updated_at
        }));
        error = null;
      }
    }
      
    return { data, error };
  },
  
  /**
   * Agrega una dirección a una entidad
   * @param {string} entityId - ID de la entidad
   * @param {string} entityType - Tipo de entidad ('user', 'property', etc.)
   * @param {object} addressData - Datos de la dirección
   * @returns {Promise<{data, error}>} - Resultado de la operación
   */
  async addAddress(entityId, entityType, addressData) {
    let allResults = [];
    let finalResult = { data: null, error: null };
    
    // Intenta escribir en todas las tablas posibles para mantener sincronización
    
    // 1. Intenta con tabla 'addresses'
    try {
      // Si esta dirección es marcada como primaria, actualizar las existentes
      if (addressData.is_primary) {
        await supabase
          .from('addresses')
          .update({ is_primary: false })
          .eq('entity_id', entityId)
          .eq('entity_type', entityType);
      }
      
      const { data, error } = await supabase
        .from('addresses')
        .insert({
          entity_id: entityId,
          entity_type: entityType,
          ...addressData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      allResults.push({ table: 'addresses', success: !error, error });
      if (!error) finalResult = { data, error };
    } catch (e) {
      allResults.push({ table: 'addresses', success: false, error: e });
    }
    
    // 2. Intenta con tabla 'person_address'
    try {
      // Mapeo de entity_type a los tipos posibles en person_address
      let personType;
      switch (entityType) {
        case 'user': personType = 'user'; break;
        case 'property': personType = 'property'; break;
        case 'borrower': personType = 'borrower'; break;
        case 'lender': personType = 'lender'; break;
        default: personType = entityType;
      }
      
      // Si esta dirección es marcada como primaria, actualizar las existentes
      if (addressData.is_primary) {
        await supabase
          .from('person_address')
          .update({ is_primary: false })
          .eq('person_id', entityId)
          .eq('person_type', personType);
      }
      
      const { data, error } = await supabase
        .from('person_address')
        .insert({
          person_id: entityId,
          person_type: personType,
          line1: addressData.line1,
          line2: addressData.line2,
          city: addressData.city,
          state_code: addressData.state_code,
          postal_code: addressData.postal_code,
          is_primary: addressData.is_primary,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      allResults.push({ table: 'person_address', success: !error, error });
      if (!error && !finalResult.data) finalResult = { data, error };
    } catch (e) {
      allResults.push({ table: 'person_address', success: false, error: e });
    }
    
    console.log('Resultados de adición de dirección:', allResults);
    
    // Si todos fallaron, devuelve el primer error
    if (finalResult.error && allResults.every(r => !r.success)) {
      return { 
        data: null, 
        error: allResults[0].error,
        allResults 
      };
    }
    
    // Devuelve éxito si al menos una operación funcionó
    return finalResult;
  },
  
  /**
   * Actualiza una dirección existente
   * @param {string} addressId - ID de la dirección
   * @param {object} addressData - Datos a actualizar
   * @param {string} entityId - ID de la entidad
   * @param {string} entityType - Tipo de entidad
   * @returns {Promise<{data, error}>} - Resultado de la operación
   */
  async updateAddress(addressId, addressData, entityId, entityType) {
    let allResults = [];
    let finalResult = { data: null, error: null };
    
    // 1. Intenta actualizar en tabla 'addresses'
    try {
      // Si esta dirección es marcada como primaria, actualizar las existentes
      if (addressData.is_primary) {
        await supabase
          .from('addresses')
          .update({ is_primary: false })
          .eq('entity_id', entityId)
          .eq('entity_type', entityType)
          .neq('address_id', addressId);
      }
      
      const { data, error } = await supabase
        .from('addresses')
        .update({
          ...addressData,
          updated_at: new Date().toISOString()
        })
        .eq('address_id', addressId);
        
      allResults.push({ table: 'addresses', success: !error, error });
      if (!error) finalResult = { data, error };
    } catch (e) {
      allResults.push({ table: 'addresses', success: false, error: e });
    }
    
    // 2. Intenta actualizar en tabla 'person_address'
    try {
      // Mapeo de entity_type a los tipos posibles en person_address
      let personType;
      switch (entityType) {
        case 'user': personType = 'user'; break;
        case 'property': personType = 'property'; break;
        case 'borrower': personType = 'borrower'; break;
        case 'lender': personType = 'lender'; break;
        default: personType = entityType;
      }
      
      // Si esta dirección es marcada como primaria, actualizar las existentes
      if (addressData.is_primary) {
        await supabase
          .from('person_address')
          .update({ is_primary: false })
          .eq('person_id', entityId)
          .eq('person_type', personType)
          .neq('id', addressId);
      }
      
      const { data, error } = await supabase
        .from('person_address')
        .update({
          line1: addressData.line1,
          line2: addressData.line2,
          city: addressData.city,
          state_code: addressData.state_code,
          postal_code: addressData.postal_code,
          is_primary: addressData.is_primary,
          updated_at: new Date().toISOString()
        })
        .eq('id', addressId);
        
      allResults.push({ table: 'person_address', success: !error, error });
      if (!error && !finalResult.data) finalResult = { data, error };
    } catch (e) {
      allResults.push({ table: 'person_address', success: false, error: e });
    }
    
    console.log('Resultados de actualización de dirección:', allResults);
    
    // Si todos fallaron, devuelve el primer error
    if (finalResult.error && allResults.every(r => !r.success)) {
      return { 
        data: null, 
        error: allResults[0].error,
        allResults 
      };
    }
    
    // Devuelve éxito si al menos una operación funcionó
    return finalResult;
  }
};
```

## Pasos de Implementación

1. **Crear archivo adaptador**: Guardar el código anterior en un archivo `src/services/dataAdapter.js`.

2. **Modificar componentes que utilizan las tablas problemáticas**:

   - `ProfileView.jsx`
   - `SettingsView.jsx`
   - `Onboarding.js`

3. **Agregar captura de errores adicional**:

```javascript
// En ProfileView.jsx
const fetchProfileData = async () => {
  setIsLoading(true);
  try {
    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Usar el adaptador para obtener el perfil
      const { data: profileData, error: profileError, allResults } = await ProfileAdapter.fetchProfile(user.id);
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        console.log('Todos los intentos de obtener perfil:', allResults);
        setErrorMessage('Error loading profile data');
      } else {
        setProfile(profileData || {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || '',
          primary_email: user.email,
          primary_phone: user.user_metadata?.phone || ''
        });
      }
      
      // Usar el adaptador para obtener direcciones
      const { data: addressData, error: addressError, allResults: addressAttempts } = 
        await AddressAdapter.fetchAddresses(user.id, 'user');
      
      if (addressError) {
        console.error('Error fetching addresses:', addressError);
        console.log('Todos los intentos de obtener direcciones:', addressAttempts);
        setErrorMessage('Error loading address data');
      } else {
        setAddresses(addressData || []);
      }
    }
  } catch (error) {
    console.error('Error global:', error);
    setErrorMessage('Error loading profile data');
    
    // Datos de demostración para desarrollo
    // ... código existente para datos mock ...
  } finally {
    setIsLoading(false);
  }
};
```

## Instrucciones de Prueba

Para verificar que la solución funciona correctamente:

1. Implementa el archivo adaptador y las modificaciones en los componentes.
2. Accede a la sección de Perfil o Configuración en la aplicación.
3. Observa en la consola del navegador los mensajes de log que indican:
   - Qué tablas se intentaron consultar primero
   - Cuáles fallaron y cuáles tuvieron éxito
   - Los resultados de las operaciones con múltiples tablas

4. Verifica en la base de datos que los datos se están guardando correctamente.

## Beneficios de esta Solución

1. **Robustez**: La aplicación seguirá funcionando independientemente de los nombres de tabla en la base de datos.
2. **Sincronización**: Los datos se guardarán en todas las tablas posibles, manteniendo la sincronización.
3. **Flexibilidad**: Fácilmente adaptable si se encuentran más discrepancias en otras tablas.
4. **Diagnóstico**: Los logs detallados facilitan la identificación de problemas.

## Próximos Pasos

Una vez implementada esta solución, se recomienda:

1. Normalizar el esquema de la base de datos a largo plazo
2. Actualizar la documentación del ERD para reflejar la estructura real
3. Implementar pruebas automatizadas para verificar que todas las operaciones funcionan correctamente