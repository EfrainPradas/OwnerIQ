// src/services/dataAdapter.js
import { supabase } from '../supabaseClient';

/**
 * Adaptador simplificado para perfiles y direcciones
 * Utiliza exclusivamente las tablas 'person' y 'person_address'
 */
export const UserDataService = {
  /**
   * Obtiene el perfil de un usuario desde la tabla person
   * @param {string} userId - ID del usuario de auth
   * @returns {Promise<{data, error}>} - Datos del perfil o error
   */
  async fetchUserProfile(userId) {
    console.log('Fetching profile from person table for user:', userId);
    
    // Buscar en tabla 'person' con kind='user'
    const { data, error } = await supabase
      .from('person')
      .select('*')
      .eq('user_id', userId)
      .eq('kind', 'user')
      .single();
    
    if (error) {
      console.error('Error fetching user profile from person:', error);
      
      // Si no existe, creamos un perfil básico desde auth.user
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Intentamos crear un nuevo registro en person
          const { data: newPerson, error: insertError } = await supabase
            .from('person')
            .insert({
              user_id: userId,
              kind: 'user',
              full_name: user.user_metadata?.full_name || '',
              primary_email: user.email,
              primary_phone: user.user_metadata?.phone || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (!insertError) {
            console.log('Created new person record for user:', newPerson);
            return { data: newPerson, error: null };
          } else {
            console.error('Error creating person record:', insertError);
          }
        }
      } catch (e) {
        console.error('Error creating profile from auth data:', e);
      }
    }
    
    return { data, error };
  },
  
  /**
   * Actualiza el perfil de un usuario en la tabla person
   * @param {string} userId - ID del usuario
   * @param {object} profileData - Datos del perfil a actualizar
   * @returns {Promise<{data, error}>} - Resultado de la operación
   */
  async updateUserProfile(userId, profileData) {
    console.log('Updating profile in person table for user:', userId, profileData);
    
    try {
      // 1. Actualizar metadatos en auth.users si es posible
      try {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            full_name: profileData.full_name,
            phone: profileData.primary_phone
          }
        });
        
        if (metadataError) {
          console.warn('Could not update auth metadata:', metadataError);
        }
      } catch (e) {
        console.warn('Error updating auth metadata:', e);
      }
      
      // 2. Verificar si existe un registro en person
      const { data: existingPerson } = await supabase
        .from('person')
        .select('person_id')
        .eq('user_id', userId)
        .eq('kind', 'user')
        .single();
      
      let result;
      
      if (existingPerson) {
        // Actualizar registro existente
        console.log('Updating existing person record:', existingPerson.person_id);
        result = await supabase
          .from('person')
          .update({
            full_name: profileData.full_name,
            primary_email: profileData.primary_email,
            primary_phone: profileData.primary_phone,
            updated_at: new Date().toISOString()
          })
          .eq('person_id', existingPerson.person_id)
          .select();
      } else {
        // Crear nuevo registro
        console.log('Creating new person record for user');
        result = await supabase
          .from('person')
          .insert({
            user_id: userId,
            kind: 'user',
            full_name: profileData.full_name,
            primary_email: profileData.primary_email,
            primary_phone: profileData.primary_phone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
      }
      
      if (result.error) {
        console.error('Error updating person record:', result.error);
      } else {
        console.log('Successfully updated person record');
      }
      
      return result;
    } catch (e) {
      console.error('Exception in updateUserProfile:', e);
      return { data: null, error: e };
    }
  },
  
  /**
   * Obtiene las direcciones de un usuario desde person_address
   * @param {string} userId - ID del usuario
   * @returns {Promise<{data, error}>} - Lista de direcciones o error
   */
  async fetchUserAddresses(userId) {
    console.log('Fetching addresses for user:', userId);
    
    const { data, error } = await supabase
      .from('person_address')
      .select('*')
      .eq('person_id', userId)
      .eq('person_type', 'user')
      .order('is_primary', { ascending: false });
    
    if (error) {
      console.error('Error fetching addresses:', error);
      return { data: [], error };
    }
    
    // Mapear campos a formato esperado por la UI
    const formattedData = data.map(addr => ({
      address_id: addr.id,
      line1: addr.line1 || addr.address_line1,
      line2: addr.line2 || addr.address_line2 || '',
      city: addr.city,
      state_code: addr.state_code || addr.state,
      postal_code: addr.postal_code || addr.zip_code,
      is_primary: addr.is_primary || false,
      created_at: addr.created_at,
      updated_at: addr.updated_at
    }));
    
    return { data: formattedData, error: null };
  },
  
  /**
   * Agrega una dirección de usuario a person_address
   * @param {string} userId - ID del usuario
   * @param {object} addressData - Datos de la dirección
   * @returns {Promise<{data, error}>} - Resultado de la operación
   */
  async addUserAddress(userId, addressData) {
    console.log('Adding address for user:', userId, addressData);
    
    try {
      // Si esta dirección es primaria, actualizar las existentes
      if (addressData.is_primary) {
        await supabase
          .from('person_address')
          .update({ is_primary: false })
          .eq('person_id', userId)
          .eq('person_type', 'user');
      }
      
      // Agregar nueva dirección
      const result = await supabase
        .from('person_address')
        .insert({
          person_id: userId,
          person_type: 'user',
          line1: addressData.line1,
          line2: addressData.line2 || '',
          city: addressData.city,
          state_code: addressData.state_code,
          postal_code: addressData.postal_code,
          is_primary: addressData.is_primary || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (result.error) {
        console.error('Error adding address:', result.error);
      } else {
        console.log('Successfully added address');
      }
      
      return result;
    } catch (e) {
      console.error('Exception in addUserAddress:', e);
      return { data: null, error: e };
    }
  },
  
  /**
   * Actualiza una dirección de usuario en person_address
   * @param {string} addressId - ID de la dirección
   * @param {string} userId - ID del usuario
   * @param {object} addressData - Datos a actualizar
   * @returns {Promise<{data, error}>} - Resultado de la operación
   */
  async updateUserAddress(addressId, userId, addressData) {
    console.log('Updating address:', addressId, addressData);
    
    try {
      // Si esta dirección es primaria, actualizar las existentes
      if (addressData.is_primary) {
        await supabase
          .from('person_address')
          .update({ is_primary: false })
          .eq('person_id', userId)
          .eq('person_type', 'user')
          .neq('id', addressId);
      }
      
      // Actualizar dirección
      const result = await supabase
        .from('person_address')
        .update({
          line1: addressData.line1,
          line2: addressData.line2 || '',
          city: addressData.city,
          state_code: addressData.state_code,
          postal_code: addressData.postal_code,
          is_primary: addressData.is_primary || false,
          updated_at: new Date().toISOString()
        })
        .eq('id', addressId)
        .select();
      
      if (result.error) {
        console.error('Error updating address:', result.error);
      } else {
        console.log('Successfully updated address');
      }
      
      return result;
    } catch (e) {
      console.error('Exception in updateUserAddress:', e);
      return { data: null, error: e };
    }
  },
  
  /**
   * Elimina una dirección de usuario de person_address
   * @param {string} addressId - ID de la dirección
   * @returns {Promise<{success, error}>} - Resultado de la operación
   */
  async deleteUserAddress(addressId) {
    console.log('Deleting address:', addressId);
    
    try {
      const { error } = await supabase
        .from('person_address')
        .delete()
        .eq('id', addressId);
      
      if (error) {
        console.error('Error deleting address:', error);
        return { success: false, error };
      }
      
      console.log('Successfully deleted address');
      return { success: true, error: null };
    } catch (e) {
      console.error('Exception in deleteUserAddress:', e);
      return { success: false, error: e };
    }
  }
};

// Función auxiliar para usarse en el componente ProfileView
export const useProfileManager = () => {
  const [profile, setProfile] = useState({});
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const fetchProfileData = async () => {
    setIsLoading(true);
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Cargar perfil
        const { data: profileData, error: profileError } = await UserDataService.fetchUserProfile(user.id);
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setErrorMessage('Error loading profile data');
        } else if (profileData) {
          setProfile(profileData);
        } else {
          // Si no hay datos, usar información básica del usuario de autenticación
          setProfile({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || '',
            primary_email: user.email,
            primary_phone: user.user_metadata?.phone || ''
          });
        }
        
        // Cargar direcciones
        const { data: addressData, error: addressError } = await UserDataService.fetchUserAddresses(user.id);
        
        if (addressError) {
          console.error('Error fetching addresses:', addressError);
          setErrorMessage('Error loading address data');
        } else {
          setAddresses(addressData || []);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfileData:', error);
      setErrorMessage('Error loading profile data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await UserDataService.updateUserProfile(user.id, profile);
        
        if (error) {
          console.error('Error updating profile:', error);
          setErrorMessage('Error updating profile information');
        } else {
          setSuccessMessage('Profile updated successfully');
          setTimeout(() => setSuccessMessage(''), 3000);
          // Actualizar perfil para reflejar cambios
          fetchProfileData();
        }
      }
    } catch (error) {
      console.error('Error in handleProfileUpdate:', error);
      setErrorMessage('Error updating profile');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Resto de funciones para manejar direcciones...
  
  return {
    profile,
    setProfile,
    addresses,
    isLoading,
    errorMessage,
    successMessage,
    fetchProfileData,
    handleProfileUpdate
    // Otras funciones para direcciones...
  };
};

// Ejemplo de uso en componente ProfileView
/*
function ProfileView() {
  const {
    profile,
    setProfile,
    addresses,
    isLoading,
    errorMessage,
    successMessage,
    fetchProfileData,
    handleProfileUpdate
  } = useProfileManager();
  
  useEffect(() => {
    fetchProfileData();
  }, []);
  
  // Resto del componente...
}
*/