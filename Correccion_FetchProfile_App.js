// Esta es la corrección específica para la función fetchProfileData en App.js
// Línea aproximada 3550-3600

const fetchProfileData = async () => {
  setIsLoading(true);
  try {
    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Buscar en tabla 'person' con kind='user'
      const { data: profileData, error: profileError } = await supabase
        .from('person')
        .select('*')
        .eq('user_id', user.id)
        .eq('kind', 'user')
        .single();
      
      if (profileError) {
        console.error('Error fetching profile from person:', profileError);
        
        // Si no existe perfil en person, usar datos de auth
        setProfile({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || '',
          primary_email: user.email,
          primary_phone: user.user_metadata?.phone || ''
        });
      } else {
        setProfile(profileData);
      }
      
      // Cargar direcciones desde person_address
      const { data: addressData, error: addressError } = await supabase
        .from('person_address')
        .select('*')
        .eq('person_id', user.id)
        .eq('person_type', 'user')
        .order('is_primary', { ascending: false });
      
      if (addressError) {
        console.error('Error fetching addresses from person_address:', addressError);
        setErrorMessage('Error loading address data');
        setAddresses([]);
      } else {
        // Mapear campos a formato esperado
        const formattedAddresses = (addressData || []).map(addr => ({
          address_id: addr.id,
          line1: addr.line1 || addr.address_line1 || '',
          line2: addr.line2 || addr.address_line2 || '',
          city: addr.city || '',
          state_code: addr.state_code || addr.state || '',
          postal_code: addr.postal_code || addr.zip_code || '',
          is_primary: addr.is_primary || false,
          created_at: addr.created_at,
          updated_at: addr.updated_at
        }));
        
        setAddresses(formattedAddresses);
      }
    }
  } catch (error) {
    console.error('Error global en fetchProfileData:', error);
    setErrorMessage('Error loading profile data');
    
    // Datos de demostración para desarrollo si es necesario
    // ... código existente para datos mock ...
  } finally {
    setIsLoading(false);
  }
};