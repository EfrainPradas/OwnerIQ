// Simple script to reset onboarding for test user
// This runs directly on the backend with admin privileges

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zapanqzqloibnbsvkbob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcGFucXpxbG9pYm5ic3ZrYm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTgzNTIsImV4cCI6MjA3NDU3NDM1Mn0.mwspXsW5xDu9CmWruosq3d0w_mPX5g-zGhZkFgCxHqM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetTestUser() {
  try {
    console.log('🔄 Resetting onboarding for eprada@teamlinx.com...');

    // First, get the user ID from auth
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      // If admin functions don't work, try direct DB query
      console.log('🔍 Trying direct database approach...');

      // Reset user_profiles
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          onboarding_status: 'INCOMPLETE',
          current_step: 1,
          updated_at: new Date().toISOString()
        })
        .eq('owner_email', 'eprada@teamlinx.com');

      if (profileError) {
        console.error('❌ Error updating profile:', profileError);
      } else {
        console.log('✅ Profile updated successfully!');
      }

      // Reset import batches
      const { error: batchError } = await supabase
        .from('import_batches')
        .update({ status: 'PENDING' })
        .eq('user_id', null); // Demo user has null user_id

      if (batchError) {
        console.error('❌ Error updating batches:', batchError);
      } else {
        console.log('✅ Batches updated successfully!');
      }

      return;
    }

    // Find the user by email
    const user = users.find(u => u.email === 'eprada@teamlinx.com');

    if (!user) {
      console.error('❌ User not found');
      return;
    }

    console.log(`📧 Found user: ${user.email} (ID: ${user.id})`);

    // Reset user_profiles
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        onboarding_status: 'INCOMPLETE',
        current_step: 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('❌ Error updating profile:', profileError);
    } else {
      console.log('✅ Profile updated successfully!');
    }

    // Reset import batches
    const { data: batches, error: batchError } = await supabase
      .from('import_batches')
      .update({ status: 'PENDING' })
      .eq('user_id', user.id);

    if (batchError) {
      console.error('❌ Error updating batches:', batchError);
    } else {
      console.log(`✅ Reset ${batches.length} batches`);
    }

    console.log('\n🎉 Onboarding reset complete!');
    console.log('📝 Now you can refresh the page and see the onboarding flow');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetTestUser();