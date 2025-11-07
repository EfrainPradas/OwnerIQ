#!/usr/bin/env node
/**
 * Apply Interest Rate Precision Migration
 *
 * This script applies the migration to change interest_rate fields
 * from NUMERIC(5,2) to NUMERIC(5,3) in the Supabase database.
 */

require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migration = `
-- Fix Interest Rate Precision - OwnerIQ
-- Changes interest rate fields from NUMERIC(5,2) to NUMERIC(5,3)

BEGIN;

-- Update property table - loan_rate field
ALTER TABLE property
ALTER COLUMN loan_rate TYPE NUMERIC(5,3);

-- Update property table - interest_rate field
ALTER TABLE property
ALTER COLUMN interest_rate TYPE NUMERIC(5,3);

-- Update property_loan table - interest_rate_pct field
ALTER TABLE property_loan
ALTER COLUMN interest_rate_pct TYPE NUMERIC(5,3);

COMMIT;
`;

async function applyMigration() {
  console.log('🔄 Applying interest rate precision migration...');
  console.log('');

  try {
    // Note: Supabase JS client doesn't support DDL statements directly
    // We need to use the REST API or SQL Editor in the dashboard
    console.log('⚠️  IMPORTANT: This migration must be run in Supabase SQL Editor');
    console.log('');
    console.log('📋 Steps to apply:');
    console.log('1. Go to: https://supabase.com/dashboard/project/zapanqzqloibnbsvkbob');
    console.log('2. Click "SQL Editor" in the left sidebar');
    console.log('3. Click "New query"');
    console.log('4. Copy and paste the SQL below:');
    console.log('');
    console.log('─'.repeat(70));
    console.log(migration);
    console.log('─'.repeat(70));
    console.log('');
    console.log('5. Click "Run" (or press Ctrl+Enter)');
    console.log('');
    console.log('✅ After running, your interest rates will support 3 decimal places!');
    console.log('   Example: 6.237% instead of 6.24%');
    console.log('');

    // Test current connection
    const { data, error } = await supabase
      .from('property')
      .select('property_id, interest_rate, loan_rate')
      .limit(1);

    if (error) {
      console.log('⚠️  Connection test failed:', error.message);
    } else {
      console.log('✅ Database connection verified');
      if (data && data.length > 0) {
        console.log('   Sample property found - ready for migration');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
