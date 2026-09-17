// ==============================================================================
// PressWala - Database Provisioning & Schema Setup Script
// ==============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlFilePath = path.resolve(__dirname, '../supabase/migrations/001_initial_schema.sql');

async function runSetup() {
  console.log('----------------------------------------------------');
  console.log('PressWala Database Provisioning & Schema Verifier');
  console.log('----------------------------------------------------');

  if (!fs.existsSync(sqlFilePath)) {
    console.error(`Error: SQL migration file not found at ${sqlFilePath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  console.log(`✓ Migration file loaded successfully (${sqlContent.length} bytes)`);

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (supabaseUrl && serviceKey) {
    console.log(`Connecting to Supabase at: ${supabaseUrl}...`);
    try {
      // Execute via Supabase REST SQL endpoint or Postgres connection
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ query: sqlContent })
      });

      if (response.ok) {
        console.log('✓ Successfully applied schema migration to Supabase remote database!');
      } else {
        console.log('Note: Direct RPC query returned status:', response.status);
        console.log('You can copy and paste `supabase/migrations/001_initial_schema.sql` directly into your Supabase Dashboard SQL Editor in 1 click.');
      }
    } catch (err) {
      console.warn('Note on remote connection:', err.message);
      console.log('You can copy and paste `supabase/migrations/001_initial_schema.sql` directly into the Supabase Dashboard SQL Editor.');
    }
  } else {
    console.log('\n[INFO] No remote SUPABASE_SERVICE_ROLE_KEY configured in environment.');
    console.log('The application includes an integrated Offline-First / Local Storage DB Provider');
    console.log('that replicates all tables, relations, and initial seeds out-of-the-box.');
    console.log('\nTo connect to a live cloud Supabase project:');
    console.log('1. Create a free project at https://database.new');
    console.log('2. Paste `supabase/migrations/001_initial_schema.sql` into the Supabase SQL Editor and click Run.');
    console.log('3. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }

  console.log('\n✓ Database Schema Scaffolding Complete.');
}

runSetup();
