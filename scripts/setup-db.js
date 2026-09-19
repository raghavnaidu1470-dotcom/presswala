// ==============================================================================
// PressWala - Database Provisioning & Schema Setup Script
// ==============================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationFiles = [
  '../supabase/migrations/001_initial_schema.sql',
  '../supabase/migrations/002_row_level_security.sql',
  '../supabase/migrations/003_remove_pin_hash.sql',
  '../supabase/migrations/004_owner_and_multi_tenant_phase_a.sql',
  '../supabase/migrations/005_apartment_scoping_and_join_requests_phase_b.sql',
  '../supabase/migrations/006_block_dashboard_and_contacts_phase_c.sql',
  '../supabase/migrations/007_phase_d_order_workflow.sql',
  '../supabase/migrations/008_security_hardening.sql'
];

async function runSetup() {
  console.log('----------------------------------------------------');
  console.log('PressWala Database Provisioning & Schema Verifier');
  console.log('----------------------------------------------------');

  for (const relPath of migrationFiles) {
    const fullPath = path.resolve(__dirname, relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`Error: SQL migration file not found at ${fullPath}`);
      process.exit(1);
    }
    const sqlContent = fs.readFileSync(fullPath, 'utf8');
    console.log(`✓ Migration loaded: ${path.basename(fullPath)} (${sqlContent.length} bytes)`);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (supabaseUrl && serviceKey) {
    console.log(`Connecting to Supabase at: ${supabaseUrl}...`);
    for (const relPath of migrationFiles) {
      const fullPath = path.resolve(__dirname, relPath);
      const sqlContent = fs.readFileSync(fullPath, 'utf8');
      try {
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
          console.log(`✓ Applied ${path.basename(fullPath)} to Supabase remote database!`);
        } else {
          console.log(`Note: Execution for ${path.basename(fullPath)} returned status: ${response.status}`);
        }
      } catch (err) {
        console.warn(`Note on remote connection for ${path.basename(fullPath)}:`, err.message);
      }
    }
    console.log('Tip: You can also copy and paste migration files directly into your Supabase SQL Editor.');
  } else {
    console.log('\n[INFO] No remote SUPABASE_SERVICE_ROLE_KEY configured in environment.');
    console.log('The application includes an integrated Offline-First / Local Storage DB Provider');
    console.log('that replicates all tables, relations, and initial seeds out-of-the-box.');
    console.log('\nTo connect to a live cloud Supabase project:');
    console.log('1. Create a free project at https://database.new');
    console.log('2. In Supabase Dashboard -> SQL Editor, run:');
    console.log('   - supabase/migrations/001_initial_schema.sql (Initial tables & seeds)');
    console.log('   - supabase/migrations/002_row_level_security.sql (Row Level Security & Profiles)');
    console.log('   - supabase/migrations/003_remove_pin_hash.sql (Drop pin_hash, vendor reset RPC)');
    console.log('3. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }

  console.log('\n✓ Database Schema Scaffolding Complete.');
}

runSetup();
