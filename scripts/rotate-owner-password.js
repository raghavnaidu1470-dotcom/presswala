// ==============================================================================
// PressWala - Platform Owner Password Rotation Script
// Usage:
//   node scripts/rotate-owner-password.js "<NEW_SECURE_PASSWORD>"
// ==============================================================================
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load .env if present
if (fs.existsSync('.env')) {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile('.env');
  } else {
    const envLines = fs.readFileSync('.env', 'utf8').split('\n');
    for (const line of envLines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        val = val.replace(/^['"](.*)['"]$/, '$1').trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const newPassword = process.argv[2];

if (!newPassword || newPassword.length < 8) {
  console.error('❌ Error: Please provide a new secure password of at least 8 characters.');
  console.error('Example: node scripts/rotate-owner-password.js "MySecurePass@2026#"');
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

async function rotatePassword() {
  console.log('----------------------------------------------------');
  console.log('PressWala: Rotating Platform Owner Password');
  console.log('----------------------------------------------------');

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Error: Supabase credentials not found in environment.');
    console.error('Ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const ownerEmail = 'super_owner_key@presswala.internal';
  console.log(`Connecting to ${supabaseUrl}...`);
  console.log(`Searching for owner account: ${ownerEmail}`);

  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    process.exit(1);
  }

  const ownerUser = usersData.users.find(u => u.email === ownerEmail);
  if (!ownerUser) {
    console.log(`Owner account not found in auth.users. Creating owner auth record...`);
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: newPassword,
      email_confirm: true,
      user_metadata: { role: 'owner', flat_number: 'SUPER_OWNER_KEY' }
    });
    if (createError) {
      console.error('❌ Failed to create owner auth user:', createError.message);
      process.exit(1);
    }
    console.log(`✓ Created owner user in auth.users (ID: ${newUser.user.id}) with the new password!`);
  } else {
    const { error: updateError } = await supabase.auth.admin.updateUserById(ownerUser.id, {
      password: newPassword
    });
    if (updateError) {
      console.error('❌ Failed to update owner password:', updateError.message);
      process.exit(1);
    }
    console.log(`✓ Owner password rotated successfully for ${ownerEmail} (ID: ${ownerUser.id})!`);
  }

  console.log('\n✅ Owner credential rotation complete. Default password is now deactivated.');
}

rotatePassword().catch(err => {
  console.error('❌ Unexpected error during rotation:', err);
  process.exit(1);
});
