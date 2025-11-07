require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fixSchema() {
  console.log('Adding missing columns to property table...');
  
  const sql = `
    ALTER TABLE property 
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS zip_code TEXT,
    ADD COLUMN IF NOT EXISTS property_type TEXT;

    UPDATE property 
    SET property_type = 'residential' 
    WHERE property_type IS NULL;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error:', error);
      console.log('\n⚠️  Could not execute via RPC. Please run the SQL manually in Supabase dashboard:');
      console.log('\n1. Go to https://supabase.com/dashboard');
      console.log('2. Select your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Copy and paste the content of add_missing_columns.sql');
      console.log('5. Click "Run"');
    } else {
      console.log('✅ Schema updated successfully!');
      console.log('Data:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
    console.log('\n⚠️  Please run the SQL manually in Supabase dashboard:');
    console.log('\n1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');  
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the content of add_missing_columns.sql');
    console.log('5. Click "Run"');
  }
}

fixSchema();