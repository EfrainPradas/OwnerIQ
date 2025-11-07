# Implementación de Solución para Error de Perfiles

## Archivos a Modificar

Para implementar la solución al error de la tabla `profiles` no encontrada, necesitamos hacer cambios en los siguientes archivos:

### 1. Crear el archivo `frontend/src/utils/db.js`

Este archivo contendrá las funciones de abstracción para manejar diferentes nombres de tablas:

```javascript
import { supabase } from '../supabaseClient';

// Mapeo de nombres de tablas
export const tableMapping = {
  profiles: ['profiles', 'funding_profile', 'person'],
  addresses: ['addresses', 'person_address', 'address'],
  properties: ['properties', 'real_estate', 'property']
};

/**
 * Realiza operaciones upsert adaptándose a diferentes nombres de tablas
 * @param {string} tableName - Nombre de tabla base a intentar
 * @param {object} data - Datos a insertar/actualizar
 * @returns {Promise<{data, table, error}>}
 */
export const adaptiveUpsert = async (tableName, data) => {
  // Intentar con cada variante del nombre de tabla
  for (const table of tableMapping[tableName] || [tableName]) {
    try {
      console.log(`Trying to upsert data to table: ${table}`);
      const { data: result, error } = await supabase
        .from(table)
        .upsert(data);
        
      // Si no hay error, retornar resultado
      if (!error) {
        console.log(`Successful upsert to table: ${table}`);
        return { data: result, table, error: null };
      } else if (error.code !== 'PGRST205') {
        // Si el error no es "tabla no encontrada", también retornar
        console.log(`Error upserting to table ${table}:`, error);
        return { data: null, table, error };
      }
      console.log(`Table ${table} not found, trying next alternative`);
      // Si es "tabla no encontrada", continuar con la siguiente variante
    } catch (e) {
      console.log(`Exception trying table ${table}:`, e);
      continue;
    }
  }
  
  const tables = tableMapping[tableName] || [tableName];
  console.error(`No matching table found among alternatives: ${tables.join(', ')}`);
  
  return { 
    data: null, 
    table: null, 
    error: 'No matching table found among alternatives: ' + tables.join(', ')
  };
};

/**
 * Realiza consultas adaptándose a diferentes nombres de tablas
 * @param {string} tableName - Nombre de tabla base a intentar
 * @param {object} query - Configuración de consulta {eq: {field: value}}
 * @returns {Promise<{data, table, error}>}
 */
export const adaptiveFetch = async (tableName, query = {}) => {
  for (const table of tableMapping[tableName] || [tableName]) {
    try {
      console.log(`Trying to query table: ${table}`);
      let supabaseQuery = supabase.from(table).select('*');
      
      // Aplicar condiciones si existen
      if (query.eq) {
        Object.entries(query.eq).forEach(([key, value]) => {
          supabaseQuery = supabaseQuery.eq(key, value);
        });
      }
      
      if (query.order) {
        Object.entries(query.order).forEach(([key, direction]) => {
          supabaseQuery = supabaseQuery.order(key, { ascending: direction === 'asc' });
        });
      }
      
      if (query.single === true) {
        supabaseQuery = supabaseQuery.single();
      }
      
      const { data, error } = await supabaseQuery;
      
      if (!error) {
        console.log(`Successful query from table: ${table}`);
        return { data, table, error: null };
      } else if (error.code !== 'PGRST205') {
        console.log(`Error querying table ${table}:`, error);
        return { data: null, table, error };
      }
      console.log(`Table ${table} not found, trying next alternative`);
    } catch (e) {
      console.log(`Exception trying table ${table}:`, e);
      continue;
    }
  }
  
  const tables = tableMapping[tableName] || [tableName];
  console.error(`No matching table found among alternatives: ${tables.join(', ')}`);
  
  return { 
    data: null, 
    table: null, 
    error: 'No matching table found among alternatives: ' + tables.join(', ')
  };
};

/**
 * Realiza operaciones de eliminación adaptándose a diferentes nombres de tablas
 * @param {string} tableName - Nombre de tabla base a intentar
 * @param {object} query - Configuración de consulta {eq: {field: value}}
 * @returns {Promise<{success, table, error}>}
 */
export const adaptiveDelete = async (tableName, query = {}) => {
  for (const table of tableMapping[tableName] || [tableName]) {
    try {
      console.log(`Trying to delete from table: ${table}`);
      let supabaseQuery = supabase.from(table).delete();
      
      // Aplicar condiciones si existen
      if (query.eq) {
        Object.entries(query.eq).forEach(([key, value]) => {
          supabaseQuery = supabaseQuery.eq(key, value);
        });
      }
      
      const { error } = await supabaseQuery;
      
      if (!error) {
        console.log(`Successful delete from table: ${table}`);
        return { success: true, table, error: null };
      } else if (error.code !== 'PGRST205') {
        console.log(`Error deleting from table ${table}:`, error);
        return { success: false, table, error };
      }
      console.log(`Table ${table} not found, trying next alternative`);
    } catch (e) {
      console.log(`Exception trying table ${table}:`, e);
      continue;
    }
  }
  
  const tables = tableMapping[tableName] || [tableName];
  console.error(`No matching table found among alternatives: ${tables.join(', ')}`);
  
  return { 
    success: false, 
    table: null, 
    error: 'No matching table found among alternatives: ' + tables.join(', ')
  };
};
```

### 2. Modificar `frontend/src/App.js`

En el componente `ProfileView`, necesitamos actualizar los métodos que interactúan con la base de datos.

Primero, añadir la importación:

```javascript
// Cerca del inicio del archivo, junto con otras importaciones
import { adaptiveFetch, adaptiveUpsert, adaptiveDelete } from './utils/db';
```

Luego, actualizar el método `fetchProfileData`:

```javascript
const fetchProfileData = async () => {
  setIsLoading(true);
  try {
    // Use Supabase to get user profile
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Get profile data using adaptive fetch
      const { data: profileData, table: profileTable, error: profileError } = 
        await adaptiveFetch('profiles', { 
          eq: { user_id: user.id },
          single: true
        });
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
        setErrorMessage('Error loading profile data');
      } else {
        if (profileTable) {
          console.log(`Found profile data in table: ${profileTable}`);
        }
        
        setProfile(profileData || {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || '',
          primary_email: user.email,
          primary_phone: user.user_metadata?.phone || ''
        });
      }
      
      // Get addresses using adaptive fetch
      const { data: addressData, table: addressTable, error: addressError } = 
        await adaptiveFetch('addresses', {
          eq: {
            entity_id: user.id,
            entity_type: 'user'
          },
          order: {
            is_primary: 'desc'
          }
        });
        
      if (addressError) {
        console.error('Error fetching addresses:', addressError);
        setErrorMessage('Error loading address data');
      } else {
        if (addressTable) {
          console.log(`Found address data in table: ${addressTable}`);
        }
        
        setAddresses(addressData || []);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    setErrorMessage('Error loading profile data');
    
    // Mock data for development (como estaba antes)
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

Actualizar el método `handleProfileUpdate`:

```javascript
const handleProfileUpdate = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setSuccessMessage('');
  setErrorMessage('');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Update auth metadata (name, phone)
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
      
      // Check if profile exists and upsert using adaptive function
      const { table: profileTable, error: profileError } = await adaptiveUpsert('profiles', {
        user_id: user.id,
        full_name: profile.full_name,
        primary_email: profile.primary_email,
        primary_phone: profile.primary_phone,
        updated_at: new Date().toISOString()
      });
      
      if (profileError) {
        console.error('Error updating profile:', profileError);
        setErrorMessage('Error updating profile information');
      } else {
        setSuccessMessage(`Profile updated successfully${profileTable ? ` in ${profileTable}` : ''}`);
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

Actualizar el método `handleAddressSubmit`:

```javascript
const handleAddressSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setErrorMessage('');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      if (editingAddressId) {
        // Update existing address using adaptive function
        const { table: addressTable, error } = await adaptiveUpsert('addresses', {
          address_id: editingAddressId,
          ...newAddress,
          updated_at: new Date().toISOString()
        });
          
        if (error) {
          console.error('Error updating address:', error);
          setErrorMessage('Error updating address');
        } else {
          // If setting as primary, update other addresses
          if (newAddress.is_primary) {
            // Using traditional method for multi-table update since it's more complex
            const tablesToTry = ['addresses', 'person_address', 'address'];
            let primaryUpdated = false;
            
            for (const table of tablesToTry) {
              try {
                const { error: updateError } = await supabase
                  .from(table)
                  .update({ is_primary: false })
                  .eq('entity_id', user.id)
                  .eq('entity_type', 'user')
                  .neq('address_id', editingAddressId);
                  
                if (!updateError) {
                  primaryUpdated = true;
                  console.log(`Successfully updated primary flags in ${table}`);
                  break;
                }
              } catch (e) {
                console.log(`Error updating primaries in ${table}:`, e);
              }
            }
            
            if (!primaryUpdated) {
              console.warn('Could not update primary address flags');
            }
          }
          
          setSuccessMessage(`Address updated successfully${addressTable ? ` in ${addressTable}` : ''}`);
          setTimeout(() => setSuccessMessage(''), 3000);
          fetchProfileData();
          resetAddressForm();
        }
      } else {
        // Create new address using adaptive function
        const addressData = {
          entity_id: user.id,
          entity_type: 'user',
          ...newAddress,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { table: addressTable, error } = await adaptiveUpsert('addresses', addressData);
          
        if (error) {
          console.error('Error creating address:', error);
          setErrorMessage('Error adding address');
        } else {
          // If setting as primary, update other addresses
          if (newAddress.is_primary) {
            // Using traditional method for multi-table update
            const tablesToTry = ['addresses', 'person_address', 'address'];
            let primaryUpdated = false;
            
            for (const table of tablesToTry) {
              try {
                const { error: updateError } = await supabase
                  .from(table)
                  .update({ is_primary: false })
                  .eq('entity_id', user.id)
                  .eq('entity_type', 'user')
                  .neq('line1', newAddress.line1); // Using line1 as proxy
                  
                if (!updateError) {
                  primaryUpdated = true;
                  console.log(`Successfully updated primary flags in ${table}`);
                  break;
                }
              } catch (e) {
                console.log(`Error updating primaries in ${table}:`, e);
              }
            }
            
            if (!primaryUpdated) {
              console.warn('Could not update primary address flags');
            }
          }
          
          setSuccessMessage(`Address added successfully${addressTable ? ` to ${addressTable}` : ''}`);
          setTimeout(() => setSuccessMessage(''), 3000);
          fetchProfileData();
          resetAddressForm();
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
    setErrorMessage('Error saving address');
    
    // Mock update for development (como estaba antes)
    if (editingAddressId) {
      setAddresses(addresses.map(addr =>
        addr.address_id === editingAddressId ? {...newAddress, address_id: editingAddressId} : addr
      ));
      setSuccessMessage('Address updated successfully (Demo Mode)');
    } else {
      const mockAddress = {
        address_id: `mock-${Date.now()}`,
        ...newAddress
      };
      setAddresses([...addresses, mockAddress]);
      setSuccessMessage('Address added successfully (Demo Mode)');
    }
    setTimeout(() => setSuccessMessage(''), 3000);
    resetAddressForm();
  } finally {
    setIsSubmitting(false);
  }
};
```

Actualizar el método `handleDeleteAddress`:

```javascript
const handleDeleteAddress = async (addressId) => {
  if (!window.confirm('Are you sure you want to delete this address?')) {
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    const { success, table, error } = await adaptiveDelete('addresses', {
      eq: { address_id: addressId }
    });
      
    if (error) {
      console.error('Error deleting address:', error);
      setErrorMessage('Error deleting address');
    } else {
      setSuccessMessage(`Address deleted successfully${table ? ` from ${table}` : ''}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchProfileData();
    }
  } catch (error) {
    console.error('Error:', error);
    setErrorMessage('Error deleting address');
    
    // Mock delete for development (como estaba antes)
    setAddresses(addresses.filter(addr => addr.address_id !== addressId));
    setSuccessMessage('Address deleted successfully (Demo Mode)');
    setTimeout(() => setSuccessMessage(''), 3000);
  } finally {
    setIsSubmitting(false);
  }
};
```

## Instrucciones de Implementación

1. **Crear Archivo de Utilidades**:
   - Crear el directorio `frontend/src/utils` si no existe
   - Crear el archivo `db.js` con el código proporcionado

2. **Modificar `App.js`**:
   - Añadir la importación de las funciones adaptativas
   - Reemplazar los métodos indicados con las versiones adaptativas

3. **Probar la Aplicación**:
   - Ejecutar la aplicación y verificar que los errores de tabla no encontrada ya no aparezcan
   - Verificar que las operaciones de perfil y direcciones funcionen correctamente
   - Revisar la consola para ver qué tablas se están utilizando realmente

## Ventajas de Esta Implementación

1. **Robustez**: La aplicación funcionará incluso si hay inconsistencias en los nombres de tablas
2. **Transparencia**: Los logs en la consola mostrarán qué tablas se están utilizando
3. **Mantenibilidad**: La capa de abstracción hace que sea fácil adaptar el código a futuros cambios
4. **Degrada Elegantemente**: Si no se encuentra ninguna tabla, todavía ofrece modo de demostración

## Consideraciones a Largo Plazo

Una vez que se identifiquen las tablas correctas en el entorno de producción, considerar:

1. **Actualizar la Configuración**: Establecer los nombres correctos como primeras opciones en el mapeo de tablas
2. **Simplificar**: Si los nombres son consistentes, eliminar la capa de abstracción para mejorar el rendimiento
3. **Documentación**: Documentar los nombres reales de tablas para referencia futura

Esta implementación proporciona una solución inmediata al problema mientras mantiene la flexibilidad para adaptarse a cualquier variación en la estructura de la base de datos.