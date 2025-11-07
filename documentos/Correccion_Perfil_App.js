// Esta es la corrección específica para la función handleProfileUpdate en App.js
// Línea aproximada 3650-3700

const handleProfileUpdate = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setSuccessMessage('');
  setErrorMessage('');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // 1. Actualizar metadatos de autenticación
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          phone: profile.primary_phone
        }
      });
      
      if (metadataError) {
        console.error('Error updating user metadata:', metadataError);
        setErrorMessage('Error updating profile metadata');
        setIsSubmitting(false);
        return;
      }
      
      // 2. Verificar si existe un registro en person
      const { data: existingPerson, error: checkError } = await supabase
        .from('person')
        .select('person_id')
        .eq('user_id', user.id)
        .eq('kind', 'user')
        .single();
      
      let updateResult;
      
      if (existingPerson) {
        // Actualizar registro existente
        console.log('Updating existing person record:', existingPerson.person_id);
        updateResult = await supabase
          .from('person')
          .update({
            full_name: profile.full_name,
            primary_email: profile.primary_email,
            primary_phone: profile.primary_phone,
            updated_at: new Date().toISOString()
          })
          .eq('person_id', existingPerson.person_id);
      } else {
        // Crear nuevo registro
        console.log('Creating new person record for user');
        updateResult = await supabase
          .from('person')
          .insert({
            user_id: user.id,
            kind: 'user',
            full_name: profile.full_name,
            primary_email: profile.primary_email,
            primary_phone: profile.primary_phone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
      
      if (updateResult.error) {
        console.error('Error updating person record:', updateResult.error);
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