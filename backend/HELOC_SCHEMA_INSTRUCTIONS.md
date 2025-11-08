# HELOC Schema Application Instructions

## Quick Summary

The HELOC calculator backend is complete! To make it functional, the database schema needs to be applied to Supabase.

## What This Schema Adds

**4 New Tables:**
1. `property_valuation` - Track property values over time for appreciation analysis
2. `heloc_line` - Manage HELOC lines of credit
3. `heloc_draw` - Record individual draws from HELOC
4. `purchase_scenario` - Analyze using HELOC equity to buy more properties

**2 Views:**
1. `current_equity_summary` - See all properties with equity & HELOC info
2. `heloc_performance` - Analyze HELOC utilization and costs

## How to Apply the Schema

### Option 1: Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://zapanqzqloibnbsvkbob.supabase.co
   - Login with your credentials

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query" button

3. **Copy Schema**
   - Open: `/home/efraiprada/projects/OwnerIQ/backend/heloc-schema.sql`
   - Copy the entire contents (Ctrl+A, Ctrl+C)

4. **Paste and Execute**
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - Wait for confirmation message

5. **Verify Tables Created**
   - Click "Table Editor" in left sidebar
   - You should see new tables:
     - property_valuation
     - heloc_line
     - heloc_draw
     - purchase_scenario

### Option 2: Using psql Command Line

If you have PostgreSQL client installed:

```bash
# From the backend directory
psql "postgresql://postgres:[YOUR_PASSWORD]@db.zapanqzqloibnbsvkbob.supabase.co:5432/postgres" < heloc-schema.sql
```

## What Happens Next

Once the schema is applied:

1. ✅ Backend API will work immediately (endpoints already created)
2. ✅ Frontend components can connect to backend
3. ✅ You can start tracking property valuations
4. ✅ You can create HELOC lines and analyze equity
5. ✅ You can model purchase scenarios using HELOC leverage

## Testing After Application

You can verify the schema was applied correctly:

```bash
# From backend directory
node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

supabase.from('property_valuation').select('count').then(({data, error}) => {
  if (error) console.log('❌ Schema not applied yet');
  else console.log('✅ Schema applied successfully!');
});
"
```

## API Endpoints Available

Once schema is applied, these endpoints will work:

```
GET    /api/heloc/equity-summary              - Get all properties with equity info
GET    /api/heloc/valuations/:propertyId      - Get valuation history for property
POST   /api/heloc/valuations                  - Add new property valuation
GET    /api/heloc/lines                       - Get all HELOC lines
GET    /api/heloc/lines/:helocId              - Get specific HELOC line
POST   /api/heloc/lines                       - Create new HELOC line
PUT    /api/heloc/lines/:helocId              - Update HELOC line
GET    /api/heloc/draws/:helocId              - Get draws for HELOC line
POST   /api/heloc/draws                       - Record new HELOC draw
GET    /api/heloc/scenarios                   - Get all purchase scenarios
POST   /api/heloc/scenarios                   - Create new purchase scenario
DELETE /api/heloc/scenarios/:scenarioId       - Delete scenario
POST   /api/heloc/calculate                   - Run HELOC calculator
GET    /api/heloc/performance/:helocId        - Get HELOC performance metrics
```

## Need Help?

If you encounter any errors:
1. Check Supabase Dashboard → Logs for error details
2. Verify all foreign key tables exist (property, person)
3. Make sure you have proper permissions in Supabase

## Files Reference

- Schema: `/home/efraiprada/projects/OwnerIQ/backend/heloc-schema.sql`
- API Routes: `/home/efraiprada/projects/OwnerIQ/backend/routes/heloc.js`
- Server Config: `/home/efraiprada/projects/OwnerIQ/backend/server.js` (line 13, 43)
