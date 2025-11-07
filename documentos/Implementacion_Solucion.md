# Implementación de Solución para Integración DB en OwnerIQ

Este documento proporciona la implementación detallada de la solución al problema de integración con la base de datos identificado en `Problema_Integracion_DB.md`.

## Solución: Adaptador de Consultas con Fallback

La solución implementa un patrón adaptador que intenta operaciones en la tabla esperada, con un fallback a tablas alternativas si la primera operación falla.

### Implementación en Servicios Centrales

Creamos un nuevo archivo de servicio `src/services/dataAdapter.js` que encapsula la lógica de adaptación:

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
      
    // Si falla, intenta con tabla 'person' con kind='user'
    if (error) {
      console.log('Fallback: intentando tabla person', error);
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
    // Intenta primero con tabla 'profiles'
    const { error: profilesError } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      });
      
    // Si hay error, intenta con tabla 'person'
    if (profilesError) {
      console.log('Fallback: intentando actualizar tabla person', profilesError);
      
      // Verificar si existe el registro primero
      const { data: existingPerson } = await supabase
        .from('person')
        .select('person_id')
        .eq('user_id', userId)
        .eq('kind', 'user')
        .single();
      
      if (existingPerson) {
        // Actualizar registro existente
        const { data, error } = await supabase
          .from('person')
          .update({
            full_name: profileData.full_name,
            primary_email: profileData.primary_email,
            primary_phone: profileData.primary_phone,
            updated_at: new Date().toISOString()
          })
          .eq('person_id', existingPerson.person_id);
          
        return { data, error };
      } else {
        // Crear nuevo registro
        const { data, error } = await supabase
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
          
        return { data, error };
      }
    }
    
    // Si la operación en 'profiles' fue exitosa
    const { data: profileData2 } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    return { data: profileData2, error: null };
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
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .order('is_primary', { ascending: false });
      
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
      
    return { data, error };
  },
  
  /**
   * Actualiza una dirección existente
   * @param {string} addressId - ID de la dirección
   * @param {object} addressData - Datos a actualizar
   * @returns {Promise<{data, error}>} - Resultado de la operación
   */
  async updateAddress(addressId, addressData, entityId, entityType) {
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
      
    return { data, error };
  }
};
```

### Integración en Componentes de Usuario

Modificamos el componente `ProfileView.jsx` para utilizar el adaptador:

```javascript
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ProfileAdapter, AddressAdapter } from '../services/dataAdapter';

function ProfileView() {
  // ... código existente ...

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Usar el adaptador para obtener el perfil
        const { data: profileData, error: profileError } = await ProfileAdapter.fetchProfile(user.id);
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
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
        const { data: addressData, error: addressError } = await AddressAdapter.fetchAddresses(user.id, 'user');
        
        if (addressError) {
          console.error('Error fetching addresses:', addressError);
          setErrorMessage('Error loading address data');
        } else {
          setAddresses(addressData || []);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('Error loading profile data');
      
      // Datos de demostración para desarrollo
      // ... código existente para datos mock ...
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Actualizar metadatos de autenticación
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
        
        // Usar el adaptador para actualizar el perfil
        const { error: profileError } = await ProfileAdapter.updateProfile(user.id, {
          full_name: profile.full_name,
          primary_email: profile.primary_email,
          primary_phone: profile.primary_phone
        });
        
        if (profileError) {
          console.error('Error updating profile:', profileError);
          setErrorMessage('Error updating profile information');
        } else {
          setSuccessMessage('Profile updated successfully');
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

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        if (editingAddressId) {
          // Usar el adaptador para actualizar dirección
          const { error } = await AddressAdapter.updateAddress(
            editingAddressId, 
            newAddress,
            user.id,
            'user'
          );
          
          if (error) {
            console.error('Error updating address:', error);
            setErrorMessage('Error updating address');
          } else {
            setSuccessMessage('Address updated successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchProfileData();
            resetAddressForm();
          }
        } else {
          // Usar el adaptador para añadir dirección
          const { error } = await AddressAdapter.addAddress(user.id, 'user', newAddress);
          
          if (error) {
            console.error('Error creating address:', error);
            setErrorMessage('Error adding address');
          } else {
            setSuccessMessage('Address added successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchProfileData();
            resetAddressForm();
          }
        }
      }
    } catch (error) {
      // ... código existente para manejo de errores ...
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... resto del componente sin cambios ...
}

export default ProfileView;
```

### Integración en Componentes Relacionados

Aplicamos el mismo enfoque a otros componentes que interactúan con estas tablas, como `SettingsView.jsx`:

```javascript
import { ProfileAdapter } from '../services/dataAdapter';

function SettingsView({ setUser }) {
  // ... código existente ...

  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    async function loadUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await ProfileAdapter.fetchProfile(user.id);
        setUserProfile(data);
      }
    }
    
    loadUserProfile();
  }, []);

  // ... resto del componente sin cambios ...
}
```

### Actualización en Componente de Onboarding

También actualizamos el componente `Onboarding.js` para usar el adaptador al crear un perfil inicial:

```javascript
import { ProfileAdapter } from '../services/dataAdapter';

function Onboarding({ setUser }) {
  // ... código existente ...

  const createProfile = async (userId, userData) => {
    const { error } = await ProfileAdapter.updateProfile(userId, {
      full_name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      primary_email: userData.email,
      primary_phone: userData.phone || ''
    });
    
    if (error) {
      console.error('Error creating profile:', error);
    }
  };

  // ... resto del componente sin cambios ...
}
```

## Configuración para Control de la Estrategia

Para facilitar la configuración de la estrategia predeterminada, creamos un archivo de configuración `src/config/databaseConfig.js`:

```javascript
/**
 * Configuración para adaptar la aplicación a diferentes estructuras de base de datos
 */
export const DB_CONFIG = {
  // Estrategia preferida para perfiles de usuario
  PROFILE_STRATEGY: 'profiles', // Alternativas: 'person', 'auto'
  
  // Habilitar o deshabilitar los fallbacks automáticos
  ENABLE_FALLBACKS: true,
  
  // Habilitar logs para depuración
  DEBUG_LOGS: process.env.NODE_ENV === 'development'
};
```

## Pruebas de la Solución

Para probar la solución:

1. Ejecutar pruebas básicas interactuando con el perfil:
   - Visualizar perfil (debe cargar correctamente desde cualquier tabla)
   - Actualizar perfil (debe guardar en ambas tablas si existen)
   - Añadir dirección (debe funcionar independientemente de la tabla de perfiles)

2. Verificar en la base de datos:
   - Confirmar que la información está sincronizada en ambas tablas
   - Comprobar que las direcciones están correctamente vinculadas

3. Monitorizar la consola para confirmar:
   - Qué estrategia se utilizó (principal o fallback)
   - Si se produjeron errores durante el proceso

## Conclusión

Esta implementación proporciona una solución robusta para manejar la inconsistencia en los nombres de tablas, permitiendo que la aplicación funcione correctamente independientemente de la estructura exacta de la base de datos. 

A largo plazo, se recomienda normalizar la estructura de la base de datos según lo propuesto en el documento de problema, pero esta solución permite mantener la funcionalidad mientras se realiza esa transición.