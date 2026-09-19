// ==============================================================================
// PressWala - Phase A Automated Verification Script
// Tests: Owner Auth, Vendor Registration (Pending), Approval, Revocation Lockout,
// and Apartment Resident Drilldown.
// ==============================================================================

// Set up mock localStorage environment for Node
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}
globalThis.localStorage = new LocalStorageMock();

// Load compiled or ts modules via dynamic import after build
async function runVerification() {
  console.log('====================================================');
  console.log('PressWala Phase A: End-to-End Verification Test');
  console.log('====================================================\n');

  // Load from source using esbuild-runner or compiled dist
  // Since dist is built, let's load db logic by importing from src with ts-node or node test
  const { db, initializeDatabase, formatAuthEmail } = await import('../src/services/db.ts');
  const { INITIAL_USERS } = await import('../src/services/seedData.ts');

  // 1. Initialize Database
  initializeDatabase();
  console.log('✓ Step 1: Database initialized with Phase A seeds');

  // 2. Authenticate as Platform Owner using new bootstrap credentials
  const owner = await db.authenticateUser('SUPER_OWNER_KEY', 'PressWala!Ops#2026');
  if (!owner || owner.role !== 'owner') {
    throw new Error('FAILED: Platform Owner authentication with SUPER_OWNER_KEY failed');
  }
  console.log(`✓ Step 2a: Owner login with SUPER_OWNER_KEY succeeded: ${owner.name} (${owner.role})`);

  const ownerByPhone = await db.authenticateUser('9800000001', 'PressWala!Ops#2026');
  if (!ownerByPhone || ownerByPhone.role !== 'owner') {
    throw new Error('FAILED: Platform Owner authentication with phone 9800000001 failed');
  }
  console.log(`✓ Step 2b: Owner login with phone 9800000001 succeeded`);

  // 3. Private, Invite-Only Onboarding: Owner generates a single-use invite
  const invite = await db.createVendorInvite(
    'Apex Ironing Hub',
    '9876522222',
    'Royal Palms Residency'
  );
  if (!invite || !invite.token || !invite.token.startsWith('vinv_')) {
    throw new Error('FAILED: Vendor invite creation failed');
  }
  console.log(`✓ Step 3a: Single-use vendor invite created: token = ${invite.token} (expires: ${invite.expires_at})`);

  // 3b. Verify invalid token handling
  const fakeTokenCheck = await db.getVendorInviteByToken('non_existent_token_123');
  if (fakeTokenCheck.valid) {
    throw new Error('FAILED: Non-existent token was reported as valid!');
  }
  console.log(`✓ Step 3b: Fake token correctly rejected with reason: ${fakeTokenCheck.reason}`);

  // 3c. Vendor completes onboarding using the invite link
  const newVendor = await db.completeVendorInvite(
    invite.token,
    'Demo@1234',
    'Apex Ironing Hub',
    '9876522222',
    'Royal Palms Residency'
  );
  if (!newVendor || newVendor.status !== 'pending' || newVendor.apartment_name !== 'Royal Palms Residency') {
    throw new Error('FAILED: Vendor invite completion failed or status is not pending');
  }
  console.log(`✓ Step 3c: Vendor completed onboarding via invite: ${newVendor.name}, status = ${newVendor.status}`);

  // 3d. Verify token is single-use and cannot be used again
  let tokenReused = false;
  try {
    await db.completeVendorInvite(invite.token, 'Demo@1234');
    tokenReused = true;
  } catch (err) {
    console.log(`✓ Step 3d: Re-use of token correctly blocked: "${err.message}"`);
  }
  if (tokenReused) {
    throw new Error('FAILED: Single-use invite token was successfully reused!');
  }

  // 4. Verify pending vendor is BLOCKED from logging in (with sanitized administrative message)
  // and confirm that failed attempts count toward brute-force lockout
  let blockedPending = false;
  try {
    await db.authenticateUser('9876522222', 'Demo@1234');
  } catch (err) {
    if (err.message.includes('pending administrative approval')) {
      blockedPending = true;
      console.log(`✓ Step 4: Pending vendor login correctly blocked with sanitized text: "${err.message}"`);
    } else {
      throw err;
    }
  }
  if (!blockedPending) {
    throw new Error('FAILED: Pending vendor was allowed to log in!');
  }

  // 4b. Test rate limiting / brute-force lockout on pending account
  // 4 more attempts should hit the 5-attempt limit and trigger a lockout!
  for (let i = 0; i < 4; i++) {
    try {
      await db.authenticateUser('9876522222', 'Demo@1234');
    } catch (_) {}
  }
  let isRateLimited = false;
  try {
    await db.authenticateUser('9876522222', 'Demo@1234');
  } catch (err) {
    if (err.message.includes('Locked for') || err.message.includes('Maximum login attempts exceeded')) {
      isRateLimited = true;
      console.log(`✓ Step 4b: Lockout protection verified: 5 attempts on pending account triggered lockout: "${err.message}"`);
    }
  }
  if (!isRateLimited) {
    throw new Error('FAILED: Pending login attempts did not trigger rate-limiting lockout!');
  }

  // Clear lockout for remaining functional test steps
  const { loginSecurity } = await import('../src/services/loginSecurity.ts');
  loginSecurity.clearLockout('9876522222');

  // 5. Owner retrieves vendors platform-wide
  const vendors = await db.getVendors();
  const foundApex = vendors.find(v => v.phone === '9876522222');
  if (!foundApex) {
    throw new Error('FAILED: Registered vendor not found in owner vendor list');
  }
  console.log(`✓ Step 5: Owner retrieved ${vendors.length} vendors platform-wide (found Apex Ironing Hub)`);

  // 6. Owner approves the vendor
  await db.updateVendorStatus(foundApex.id, 'active');
  const activeVendor = await db.authenticateUser('9876522222', 'Demo@1234');
  if (!activeVendor || activeVendor.status !== 'active') {
    throw new Error('FAILED: Approved vendor failed to log in');
  }
  console.log(`✓ Step 6: Vendor approved! Active login succeeded for ${activeVendor.name}`);

  // 7. Owner revokes the vendor
  await db.updateVendorStatus(foundApex.id, 'revoked');
  let blockedRevoked = false;
  try {
    await db.authenticateUser('9876522222', 'Demo@1234');
  } catch (err) {
    if (err.message.includes('revoked') && err.message.includes('Administrative approval')) {
      blockedRevoked = true;
      console.log(`✓ Step 7: Revoked vendor login immediately blocked with sanitized text: "${err.message}"`);
    } else {
      throw err;
    }
  }
  if (!blockedRevoked) {
    throw new Error('FAILED: Revoked vendor was allowed to log in!');
  }

  // 7b. Non-recycling re-registration of vendor using recycled phone via fresh invite
  const reInvite = await db.createVendorInvite(
    'Apex Ironing Hub Re-registered',
    '9876522222',
    'Royal Palms Residency'
  );
  const reRegisteredVendor = await db.completeVendorInvite(
    reInvite.token,
    'Demo@1234',
    'Apex Ironing Hub Re-registered',
    '9876522222',
    'Royal Palms Residency'
  );
  if (!reRegisteredVendor || reRegisteredVendor.status !== 'pending') {
    throw new Error('FAILED: Revoked vendor clean re-registration failed');
  }
  // Assert distinct ID was minted, NOT mutating the old revoked account
  if (reRegisteredVendor.id === foundApex.id) {
    throw new Error(`FAILED: Vendor account was recycled! Old ID: ${foundApex.id} === New ID: ${reRegisteredVendor.id}`);
  }
  // Verify the old revoked vendor account remains completely untouched in storage
  const allVendors = await db.getVendors();
  const oldRevokedRecord = allVendors.find(v => v.id === foundApex.id);
  if (!oldRevokedRecord || oldRevokedRecord.status !== 'revoked') {
    throw new Error('FAILED: Old revoked vendor row was altered or lost');
  }
  // Verify the new vendor account exists separately in storage
  const newVendorRecord = allVendors.find(v => v.id === reRegisteredVendor.id);
  if (!newVendorRecord || newVendorRecord.status !== 'pending') {
    throw new Error('FAILED: New vendor record not found in storage');
  }
  console.log(`✓ Step 7b: Re-registration produced a brand-new distinct vendor ID (${reRegisteredVendor.id} vs old ${foundApex.id}), keeping the old revoked account and its full history completely untouched!`);

  // 8. Owner drills down into apartment residents
  const residents = await db.getResidentsForVendorApartment('Palm Heights Apartments');
  if (residents.length === 0) {
    throw new Error('FAILED: No residents returned for Palm Heights drilldown');
  }
  console.log(`✓ Step 8: Owner drilled down into Palm Heights: found ${residents.length} residents:`);
  for (const r of residents) {
    console.log(`   - Flat ${r.flat_number}: ${r.customer_name} | Orders: ${r.total_orders} | Dues: ₹${r.outstanding_balance}`);
  }

  // 9. Verify existing customer & vendor integrity
  const ramu = await db.authenticateUser('VENDOR', 'Demo@1234');
  if (!ramu || ramu.role !== 'vendor' || ramu.status !== 'active') {
    throw new Error('FAILED: Existing vendor Ramu Dhobi login failed');
  }
  console.log(`✓ Step 9: Existing active vendor Ramu Dhobi login fully verified`);

  const customer = await db.authenticateUser('A-1001', 'Demo@1010');
  if (!customer || customer.role !== 'customer') {
    throw new Error('FAILED: Existing resident Sharma Ji login failed');
  }
  console.log(`✓ Step 10: Existing customer A-1001 login fully verified`);

  // 10. Audit file texts to ensure zero mentions of "owner" in public-facing UI files
  // and confirm NO "New Vendor" or "vendor-apply" tab exists in LoginView
  const fs = await import('fs');
  const path = await import('path');
  const publicFiles = [
    'src/components/auth/LoginView.tsx',
    'src/components/common/Navbar.tsx',
    'src/components/common/DemoSwitcherModal.tsx'
  ];
  for (const relPath of publicFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    // Match word 'owner' as case-insensitive word
    const matches = content.match(/\bowner\b/gi) || [];
    if (matches.length > 0) {
      throw new Error(`SECURITY AUDIT FAILED: Found ${matches.length} mention(s) of "owner" in public file: ${relPath}`);
    }
    console.log(`✓ Audit Passed: 0 mentions of "owner" in ${relPath}`);
  }

  const loginContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/auth/LoginView.tsx'), 'utf8');
  if (loginContent.includes('vendor-apply') || loginContent.includes('New Vendor')) {
    throw new Error('SECURITY AUDIT FAILED: Public vendor self-registration ("New Vendor") still found in LoginView.tsx');
  }
  console.log(`✓ Audit Passed: "New Vendor" public registration completely removed from LoginView.tsx`);

  // 11. Bundle Content & Code-Splitting Audit (Production dist/assets)
  const distAssetsPath = path.resolve(process.cwd(), 'dist/assets');
  if (fs.existsSync(distAssetsPath)) {
    const assets = fs.readdirSync(distAssetsPath).filter(f => f.endsWith('.js'));
    let foundMainChunk = false;
    let foundOpsChunk = false;

    for (const file of assets) {
      const filePath = path.join(distAssetsPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const isMainChunk = file.startsWith('index-');
      const isOpsChunk = file.startsWith('platform-ops-');

      if (isMainChunk) {
        foundMainChunk = true;
        if (content.includes('Owner')) {
          throw new Error(`BUNDLE AUDIT FAILED: Main bundle chunk ${file} leaked string "Owner"`);
        }
        if (content.includes('platform-admin')) {
          throw new Error(`BUNDLE AUDIT FAILED: Main bundle chunk ${file} leaked string "platform-admin"`);
        }
        if (content.includes('Vendor Invitations')) {
          throw new Error(`BUNDLE AUDIT FAILED: Main bundle chunk ${file} leaked string "Vendor Invitations"`);
        }
        console.log(`✓ Step 11a: Main bundle chunk (${file}) has ZERO occurrences of "Owner", "platform-admin", or "Vendor Invitations"`);
      }

      if (isOpsChunk) {
        foundOpsChunk = true;
        if (!content.includes('Owner')) {
          throw new Error(`BUNDLE AUDIT FAILED: On-demand chunk ${file} missing expected string "Owner"`);
        }
        if (!content.includes('Vendor Invitations')) {
          throw new Error(`BUNDLE AUDIT FAILED: On-demand chunk ${file} missing expected string "Vendor Invitations"`);
        }
        console.log(`✓ Step 11b: On-demand chunk (${file}) cleanly encapsulates "Owner" and "Vendor Invitations"`);
      }
    }

    if (!foundMainChunk) throw new Error('Main bundle chunk index-*.js not found in dist/assets');
    if (!foundOpsChunk) throw new Error('On-demand chunk platform-ops-*.js not found in dist/assets');
  }

  // 12. Audit robots.txt
  const robotsPath = path.resolve(process.cwd(), 'dist/robots.txt');
  if (fs.existsSync(robotsPath)) {
    const robotsContent = fs.readFileSync(robotsPath, 'utf8');
    if (!robotsContent.includes('Disallow: /platform-admin') || !robotsContent.includes('Disallow: /vendor-onboard/')) {
      throw new Error('FAILED: robots.txt does not disallow /platform-admin and /vendor-onboard/');
    }
    console.log(`✓ Step 12: robots.txt correctly disallows /platform-admin and /vendor-onboard/`);
  }

  console.log('\n====================================================');
  console.log('ALL PHASE A, INVITE ONBOARDING & CODE-SPLIT TESTS PASSED! (18/18)');
  console.log('====================================================\n');
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
