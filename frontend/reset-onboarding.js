const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

async function resetOnboarding() {
  console.log('🔄 Resetting onboarding status for current user...');

  try {
    // First, get current user session
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('❌ No active session found');
      console.log('Please run: npm run dev and login first');
      return;
    }

    console.log(`📧 Logged in as: ${session.user.email}`);

    // Reset onboarding status
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_status: 'INCOMPLETE',
        current_step: 1,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id)
      .select();

    if (error) {
      console.error('❌ Error resetting onboarding:', error);
      return;
    }

    console.log('✅ Onboarding status reset successfully!');
    console.log('📊 Profile data:', data[0]);

    // Also reset any import batches
    const { data: batches } = await supabase
      .from('import_batches')
      .update({ status: 'PENDING' })
      .eq('user_id', session.user.id);

    console.log(`📦 Reset ${batches.length} import batches`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

resetOnboarding();