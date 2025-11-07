// Esta es la corrección específica para las funciones de manejo de direcciones en App.js
// Para las líneas de código que gestionan el CRUD de direcciones

// Función para añadir una dirección
const handleAddressSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setErrorMessage('');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      let result;
      
      if (editingAddressId) {
        // Si esta dirección es marcada como primaria, actualizar las existentes
        if (newAddress.is_primary) {
          await supabase
            .from('person_address')
            .update({ is_primary: false })
            .eq('person_id', user.id)
            .eq('person_type', 'user')
            .neq('id', editingAddressId);
        }
        
        // Actualizar dirección existente
        result = await supabase
          .from('person_address')
          .update({
            line1: newAddress.line1,
            line2: newAddress.line2 || '',
            city: newAddress.city,
            state_code: newAddress.state_code,
            postal_code: newAddress.postal_code,
            is_primary: newAddress.is_primary || false,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAddressId);
          
      } else {
        // Si esta dirección es marcada como primaria, actualizar las existentes
        if (newAddress.is_primary) {
          await supabase
            .from('person_address')
            .update({ is_primary: false })
            .eq('person_id', user.id)
            .eq('person_type', 'user');
        }
        
        // Crear nueva dirección
        result = await supabase
          .from('person_address')
          .insert({
            person_id: user.id,
            person_type: 'user',
            line1: newAddress.line1,
            line2: newAddress.line2 || '',
            city: newAddress.city,
            state_code: newAddress.state_code,
            postal_code: newAddress.postal_code,
            is_primary: newAddress.is_primary || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
      
      const { error } = result;
      
      if (error) {
        console.error(editingAddressId ? 'Error updating address:' : 'Error adding address:', error);
        setErrorMessage(`Error ${editingAddressId ? 'updating' : 'adding'} address`);
      } else {
        setSuccessMessage(`Address ${editingAddressId ? 'updated' : 'added'} successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchProfileData();
        resetAddressForm();
      }
    }
  } catch (error) {
    console.error('Error in handleAddressSubmit:', error);
    setErrorMessage(`Error ${editingAddressId ? 'updating' : 'adding'} address`);
  } finally {
    setIsSubmitting(false);
  }
};

// Función para eliminar una dirección
const handleDeleteAddress = async (addressId) => {
  if (!window.confirm('Are you sure you want to delete this address?')) {
    return;
  }
  
  setIsSubmitting(true);
  
  try {
    const { error } = await supabase
      .from('person_address')
      .delete()
      .eq('id', addressId);
    
    if (error) {
      console.error('Error deleting address:', error);
      setErrorMessage('Error deleting address');
    } else {
      setSuccessMessage('Address deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchProfileData();
    }
  } catch (error) {
    console.error('Error in handleDeleteAddress:', error);
    setErrorMessage('Error deleting address');
  } finally {
    setIsSubmitting(false);
  }
};