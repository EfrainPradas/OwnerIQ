require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function applySchema() {
  console.log('📋 Applying HELOC schema to Supabase...\n');

  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'heloc-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split the schema into individual statements
    // Remove comments and split by semicolons
    const statements = schema
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Skip empty statements
      if (!stmt || stmt.length < 10) continue;

      // Identify what we're creating
      let description = 'Executing statement';
      if (stmt.includes('CREATE TABLE')) {
        const match = stmt.match(/CREATE TABLE.*?\s+(\w+)\s*\(/i);
        if (match) description = `Creating table: ${match[1]}`;
      } else if (stmt.includes('CREATE INDEX')) {
        const match = stmt.match(/CREATE INDEX\s+(\w+)/i);
        if (match) description = `Creating index: ${match[1]}`;
      } else if (stmt.includes('CREATE OR REPLACE VIEW')) {
        const match = stmt.match(/CREATE OR REPLACE VIEW\s+(\w+)/i);
        if (match) description = `Creating view: ${match[1]}`;
      } else if (stmt.includes('COMMENT ON')) {
        description = 'Adding comment';
      }

      process.stdout.write(`${i + 1}/${statements.length} ${description}... `);

      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: stmt + ';'
        });

        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase
            .from('_sql')
            .select('*')
            .limit(0);

          // If we can't use RPC, we need to use Supabase SQL Editor
          console.log('⚠️  REQUIRES MANUAL EXECUTION');
          errorCount++;
        } else {
          console.log('✅');
          successCount++;
        }
      } catch (err) {
        console.log(`❌ ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Schema Application Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📝 Total: ${statements.length}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements could not be executed via API.');
      console.log('   Please apply the schema manually using Supabase SQL Editor:');
      console.log('   1. Go to https://zapanqzqloibnbsvkbob.supabase.co');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Copy and paste the contents of heloc-schema.sql');
      console.log('   4. Click "Run" to execute');
    } else {
      console.log('\n🎉 Schema applied successfully!');
    }

  } catch (error) {
    console.error('\n❌ Error applying schema:', error.message);
    console.log('\n📋 Manual steps required:');
    console.log('   1. Go to Supabase Dashboard: https://zapanqzqloibnbsvkbob.supabase.co');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Open a new query');
    console.log('   4. Copy and paste the entire contents of backend/heloc-schema.sql');
    console.log('   5. Click "Run" to execute the schema');
    process.exit(1);
  }
}

applySchema();
