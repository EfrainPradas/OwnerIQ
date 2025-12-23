// Execute onboarding schema SQL
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://zapanqzqloibnbsvkbob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InphcGFucXpxbG9pYm5ic3ZrYm9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTgzNTIsImV4cCI6MjA3NDU3NDM1Mn0.mwspXsW5xDu9CmWruosq3d0w_mPX5g-zGhZkFgCxHqM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupOnboardingSchema() {
  try {
    console.log('📋 Reading onboarding schema SQL file...');
    const sql = fs.readFileSync('onboarding-schema.sql', 'utf8');

    console.log('⚠️  Note: Supabase anon key cannot execute DDL statements');
    console.log('📝 You need to run this SQL manually in Supabase SQL Editor:');
    console.log('\n--- SQL to run in Supabase Dashboard ---');
    console.log(sql.substring(0, 1000) + '...');
    console.log('\n--- Full SQL file location ---');
    console.log('File: onboarding-schema.sql');

    // Try to insert a test record to see if tables exist
    console.log('\n🔍 Checking if tables exist...');

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);

      if (error && error.code === 'PGRST205') {
        console.log('❌ Tables do not exist. Please run the SQL schema first.');
      } else {
        console.log('✅ Tables exist!');
      }
    } catch (e) {
      console.log('❌ Error checking tables:', e.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupOnboardingSchema();