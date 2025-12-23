const fetch = require('node-fetch');

async function resetOnboardingStatus() {
  console.log('🔄 Resetting onboarding status for eprada@teamlinx.com...');

  try {
    // Get auth token by logging in first
    console.log('🔐 Logging in to get auth token...');
    const loginResponse = await fetch('http://localhost:5000/api/clients/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'eprada@teamlinx.com',
        password: 'Prada2025'  // You may need to update this password
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', await loginResponse.text());
      return;
    }

    const { token } = await loginResponse.json();
    console.log('✅ Login successful, got token');

    // Now reset the onboarding status
    console.log('🔄 Resetting onboarding status...');
    const resetResponse = await fetch('http://localhost:5001/api/onboarding/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({})
    });

    if (resetResponse.ok) {
      const result = await resetResponse.json();
      console.log('✅ Onboarding status reset successfully!');
      console.log('📊 Result:', result);
    } else {
      console.error('❌ Reset failed:', await resetResponse.text());
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetOnboardingStatus();