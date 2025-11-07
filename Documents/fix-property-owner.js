// Script para corregir el propietario de la propiedad demo
// Ejecutar con: node fix-property-owner.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function fixPropertyOwner() {
  console.log('🔧 Corrigiendo propietario de la propiedad demo...');

  try {
    // Primero, obtener el usuario autenticado actual
    // Esto asume que hay una sesión activa
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('❌ No hay usuario autenticado. Por favor, inicia sesión primero.');
      console.log('💡 Solución: Ve al frontend, inicia sesión, y luego ejecuta este script.');
      return;
    }

    const authenticatedUserId = user.id;
    console.log(`👤 Usuario autenticado: ${authenticatedUserId} (${user.email})`);

    // ID de la propiedad demo
    const propertyId = '21733268-7f01-4e03-9303-f9c592c19419';

    console.log(`🔄 Actualizando propiedad ${propertyId} para usuario ${authenticatedUserId}...`);

    // Verificar que la propiedad existe
    const { data: existingProperty, error: checkError } = await supabase
      .from('property')
      .select('property_id, person_id, address')
      .eq('property_id', propertyId)
      .single();

    if (checkError || !existingProperty) {
      console.error('❌ Propiedad no encontrada:', checkError?.message || 'No existe');
      return;
    }

    console.log(`📋 Propiedad actual:`, existingProperty);

    // Actualizar la propiedad
    const { data, error } = await supabase
      .from('property')
      .update({ person_id: authenticatedUserId })
      .eq('property_id', propertyId)
      .select();

    if (error) {
      console.error('❌ Error actualizando propiedad:', error);
      return;
    }

    console.log('✅ Propiedad actualizada exitosamente:', data);

    // Verificar que la actualización fue correcta
    const { data: verifyData, error: verifyError } = await supabase
      .from('property')
      .select('property_id, person_id, address')
      .eq('property_id', propertyId)
      .single();

    if (verifyError) {
      console.error('❌ Error verificando actualización:', verifyError);
      return;
    }

    console.log('🔍 Verificación final:', verifyData);
    console.log('🎉 ¡Propiedad corregida! Ahora debería aparecer en tu cuenta.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPropertyOwner();