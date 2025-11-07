// src/services/dataAdapter.js
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
    console.log('Fetching profile for user:', userId);
    
    // Primera estrategia: tabla 'funding_profile' (basado en el error que sugiere esta tabla)
    let { data, error } = await supabase
      .from('funding_profile')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Si falla, intenta con tabla 'profiles'  
    if (error) {
      console.log('Error fetching from funding_profile, trying profiles', error);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (!profileError) {
        data = profileData;
        error = null;
        return { data, error };
      }
      
      // Si también falla, intenta con tabla 'person'
      console.log('Error fetching from profiles, trying person', profileError);
      const { data: personData, error: personError } = await supabase
        .from('person')
        .select('*')
        .eq('user_id', userId)
        .eq('kind', 'user')
        .single();
        
      if (!personError) {
        // Mapeo de campos para mantener consistencia
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
    
    // Si todos los intentos fallaron, crea un perfil básico desde auth.user
    if (error) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          data = {
            user_id: user.id,
            full_name: user.user_metadata?.full_name || '',
            primary_email: user.email,
            primary_phone: user.user_metadata?.phone || ''
          };
          error = null;
          console.log('Using auth data as fallback for profile');
        }
      } catch (e) {
        console.error('Error fetching user auth data:', e);
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
    console.log('Updating profile for user:', userId, profileData);
    let allResults = [];
    let finalResult = { data: null, error: null };
    
    // 1. Intenta con tabla 'funding_profile' primero (basado en el error)
    try {
      const { data, error } = await supabase
        .from('funding_profile')
        .upsert({
          user_id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        });
      
      allResults.push({ table: 'funding_profile', success: !error, error });
      if (!error) {
        console.log('Successfully updated funding_profile');
        finalResult = { data, error };
      }
    } catch (e) {
      console.error('Error updating funding_profile:', e);
      allResults.push({ table: 'funding_profile', success: false, error: e });
    }
    
    // 2. Intenta con tabla 'profiles'
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        });
      
      allResults.push({ table: 'profiles', success: !error, error });
      if (!error && !finalResult.data) {
        console.log('Successfully updated profiles');
        finalResult = { data, error };
      }
    } catch (e) {
      console.error('Error updating profiles:', e);
      allResults.push({ table: 'profiles', success: false, error: e });
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
          
        if (!personResult.error) {
          console.log('Successfully updated person');
        }  
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
          
        if (!personResult.error) {
          console.log('Successfully created new person record');
        }
      }
      
      allResults.push({ table: 'person', success: !personResult.error, error: personResult.error });
      if (!personResult.error && !finalResult.data) finalResult = personResult;
    } catch (e) {
      console.error('Error updating person:', e);
      allResults.push({ table: 'person', success: false, error: e });
    }
    
    console.log('Profile update results:', allResults);
    
    // Si al menos una operación tuvo éxito, consideramos la operación exitosa
    if (allResults.some(r => r.success)) {
      return { data: finalResult.data, error: null, allResults };
    }
    
    // Si todos fallaron, devuelve el primer error
    return { 
      data: null, 
      error: allResults[0]?.error || new Error('All profile update attempts failed'),
      allResults 
    };
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
    console.log('Fetching addresses for entity:', entityId, entityType);
    
    // Primera estrategia: tabla 'person_address' (basado en el error)
    let { data, error } = await supabase
      .from('person_address')
      .select('*')
      .eq('person_id', entityId)
      .eq('person_type', entityType)
      .order('is_primary', { ascending: false });
    
    // Si falla, intenta con tabla 'addresses'  
    if (error) {
      console.log('Error fetching from person_address, trying addresses', error);
      const { data: addressData, error: addressError } = await supabase
        .from('addresses')
        .select('*')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .order('is_primary', { ascending: false });
        
      if (!addressError) {
        data = addressData;
        error = null;
      }
    } else {
      // Mapeo de campos de person_address al formato esperado por la UI
      data = data.map(addr => ({
        address_id: addr.id || addr.address_id,
        entity_id: addr.person_id,
        entity_type: addr.person_type,
        line1: addr.line1 || addr.address_line1,
        line2: addr.line2 || addr.address_line2 || '',
        city: addr.city,
        state_code: addr.state_code || addr.state,
        postal_code: addr.postal_code || addr.zip_code,
        is_primary: addr.is_primary || false,
        created_at: addr.created_at,
        updated_at: addr.updated_at
      }));
    }
      
    return { data: data || [], error };
  },
  
  /**
   * Agrega una dirección a una entidad
   * @param {string} entityId - ID de la entidad
   * @param {string} entityType - Tipo de entidad ('user', 'property', etc.)
   * @param {object} addressData - Datos de la dirección
   * @returns {Promise<{data, error}>} - Resultado de la operación
   */
  async addAddress(entityId, entityType, addressData) {
    console.log('Adding address for entity:', entityId, entityType, addressData);
    
    // Primero intentar con person_address (basado en el error)
    try {
      // Si esta dirección es marcada como primaria, actualizar las existentes
      if (addressData.is_primary) {
        await supabase
          .from('person_address')
          .update({ is_primary: false })
          .eq('person_id', entityId)
          .eq('person_type', entityType);
      }
      
      const { data, error } = await supabase
        .from('person_address')
        .insert({
          person_id: entityId,
          person_type: entityType,
          line1: addressData.line1,
          line2: addressData.line2,
          city: addressData.city,
          state_code: addressData.state_code,
          postal_code: addressData.postal_code,
          is_primary: addressData.is_primary,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error adding to person_address, trying addresses table', error);
        
        // Si falla, intentar con addresses
        if (addressData.is_primary) {
          await supabase
            .from('addresses')
            .update({ is_primary: false })
            .eq('entity_id', entityId)
            .eq('entity_type', entityType);
        }
        
        const addressResult = await supabase
          .from('addresses')
          .insert({
            entity_id: entityId,
            entity_type: entityType,
            ...addressData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        return addressResult;
      }
      
      return { data, error };
    } catch (e) {
      console.error('Error in addAddress:', e);
      return { data: null, error: e };
    }
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
    console.log('Updating address:', addressId, addressData, entityId, entityType);
    
    try {
      // Primero intentar con person_address
      // Si esta dirección es marcada como primaria, actualizar las existentes
      if (addressData.is_primary) {
        await supabase
          .from('person_address')
          .update({ is_primary: false })
          .eq('person_id', entityId)
          .eq('person_type', entityType)
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
        
      if (error) {
        console.error('Error updating person_address, trying addresses table', error);
        
        // Si falla, intentar con addresses
        if (addressData.is_primary) {
          await supabase
            .from('addresses')
            .update({ is_primary: false })
            .eq('entity_id', entityId)
            .eq('entity_type', entityType)
            .neq('address_id', addressId);
        }
        
        const addressResult = await supabase
          .from('addresses')
          .update({
            ...addressData,
            updated_at: new Date().toISOString()
          })
          .eq('address_id', addressId);
          
        return addressResult;
      }
      
      return { data, error };
    } catch (e) {
      console.error('Error in updateAddress:', e);
      return { data: null, error: e };
    }
  }
};

/**
 * Función de utilidad para actualizar el perfil de un usuario
 * Esta función está diseñada para ser utilizada directamente en cualquier componente
 */
export const updateUserProfile = async (userId, profileData) => {
  if (!userId) {
    console.error('No user ID provided for profile update');
    return { error: 'No user ID provided' };
  }

  // 1. Actualizar metadatos de autenticación
  try {
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        full_name: profileData.full_name,
        phone: profileData.primary_phone
      }
    });
    
    if (metadataError) {
      console.error('Error updating user metadata:', metadataError);
      return { error: metadataError };
    }
  } catch (e) {
    console.error('Exception updating auth user:', e);
  }
  
  // 2. Actualizar perfil usando el adaptador
  return await ProfileAdapter.updateProfile(userId, profileData);
};

/**
 * Función para reemplazar handleProfileUpdate en componentes
 */
export const createProfileUpdateHandler = (setIsSubmitting, setSuccessMessage, setErrorMessage, setProfile) => {
  return async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const result = await updateUserProfile(user.id, profile);
        
        if (result.error) {
          console.error('Error updating profile:', result.error);
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
};