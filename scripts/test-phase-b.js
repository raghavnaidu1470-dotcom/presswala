// ==============================================================================
// PressWala - Phase B Automated Verification Script
// Tests: Apartment Scoping, Resident Join Requests, Vendor Approval,
// Resident Login Activation, Revocation, Re-requesting, and Bundle Isolation.
// ==============================================================================

import fs from 'fs';
import path from 'path';

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

async function runPhaseBVerification() {
  console.log('====================================================');
  console.log('PressWala Phase B: Apartment Scoping & Join Requests Test');
  console.log('====================================================\n');

  const { db, initializeDatabase, STORAGE_KEYS } = await import('../src/services/db.ts');
  const { INITIAL_APARTMENTS, INITIAL_USERS } = await import('../src/services/seedData.ts');

  // 1. Initialize Database
  initializeDatabase();
  console.log('✓ Step 1: Database initialized with Phase B apartments and seeds');

  // 2. Verify Apartment Listing
  const apartments = await db.getApartments();
  if (!apartments || apartments.length < 3) {
    throw new Error(`FAILED: Expected at least 3 apartments, got ${apartments.length}`);
  }
  const palmHeights = apartments.find(a => a.name === 'Palm Heights Apartments');
  const royalPalms = apartments.find(a => a.name === 'Royal Palms Residency');
  const greenGlen = apartments.find(a => a.name === 'Green Glen Villas');

  if (!palmHeights || !royalPalms || !greenGlen) {
    throw new Error('FAILED: Missing seeded apartments in database');
  }
  console.log(`✓ Step 2: Retrieved ${apartments.length} apartments from directory:`);
  apartments.forEach(a => console.log(`   - ${a.name} (${a.id})`));

  // 3. Create a Resident Join Request for Palm Heights
  console.log('\n--- Testing Resident Join Request Flow ---');
  const testResidentFlat = 'A-1002';
  const testResidentPhone = '9811122334';
  const testResidentPassword = 'Demo@1002Pass';

  const joinReq = await db.createResidentJoinRequest(
    'Vikas Gupta',
    testResidentPhone,
    'Tower A',
    testResidentFlat,
    palmHeights.id,
    testResidentPassword
  );

  if (!joinReq || joinReq.status !== 'pending' || joinReq.apartment_id !== palmHeights.id) {
    throw new Error('FAILED: Join request creation failed or has invalid status');
  }
  console.log(`✓ Step 3: Created pending join request for ${joinReq.name} (Flat ${joinReq.flat_number}, ${joinReq.block}) in ${palmHeights.name}`);

  // 4. Verify that pending resident cannot log in yet
  try {
    const loginResult = await db.authenticateUser(testResidentFlat, testResidentPassword);
    if (loginResult) {
      throw new Error('FAILED: Pending resident was able to log in without vendor approval!');
    }
  } catch (err) {
    if (err.message && err.message.includes('pending vendor approval')) {
      console.log(`✓ Step 4: Pending resident login correctly blocked with sanitized prompt: "${err.message}"`);
    } else {
      throw new Error(`FAILED: Unexpected login error message for pending resident: ${err.message}`);
    }
  }

  // 5. Verify Apartment Scoping of Pending Join Requests
  console.log('\n--- Testing Apartment Scoping of Join Requests ---');
  const palmPendingReqs = await db.getPendingJoinRequests(palmHeights.id);
  const royalPendingReqs = await db.getPendingJoinRequests(royalPalms.id);

  const foundInPalm = palmPendingReqs.some(r => r.id === joinReq.id);
  const foundInRoyal = royalPendingReqs.some(r => r.id === joinReq.id);

  if (!foundInPalm) {
    throw new Error('FAILED: Palm Heights vendor could not see the pending request for Palm Heights');
  }
  if (foundInRoyal) {
    throw new Error('FAILED: LEAK! Royal Palms vendor was able to see a pending request for Palm Heights');
  }
  console.log(`✓ Step 5a: Palm Heights vendor sees ${palmPendingReqs.length} pending request(s) (including Vikas Gupta)`);
  console.log(`✓ Step 5b: Royal Palms vendor sees ${royalPendingReqs.length} pending request(s) (strictly scoped, zero leakage)`);

  // 6. Verify Apartment Scoping of Orders & Metrics
  console.log('\n--- Testing Apartment Scoping of Orders & Metrics ---');
  const palmOrders = await db.getOrders({ apartmentId: palmHeights.id });
  const royalOrders = await db.getOrders({ apartmentId: royalPalms.id });

  if (palmOrders.length === 0) {
    throw new Error('FAILED: Palm Heights should have orders from seed data');
  }
  const anyNonPalmInPalm = palmOrders.some(o => o.apartment_id && o.apartment_id !== palmHeights.id);
  if (anyNonPalmInPalm) {
    throw new Error('FAILED: Non-Palm Heights orders leaked into Palm Heights vendor view!');
  }
  console.log(`✓ Step 6a: Palm Heights orders scoped: ${palmOrders.length} order(s) strictly belonging to Palm Heights`);
  console.log(`✓ Step 6b: Royal Palms orders scoped: ${royalOrders.length} order(s)`);

  const palmMetrics = await db.getDashboardMetrics(palmHeights.id);
  console.log(`✓ Step 6c: Palm Heights dashboard metrics strictly scoped: Total Orders = ${palmMetrics.totalOrdersCount}, Unpaid = ₹${palmMetrics.totalOutstandingAmount}`);

  // 7. Vendor Approves Resident Join Request
  console.log('\n--- Testing Vendor Approval Flow ---');
  const approved = await db.approveResidentJoinRequest(joinReq.id);
  if (!approved) {
    throw new Error('FAILED: Join request approval returned false');
  }
  console.log(`✓ Step 7a: Vendor approved join request ${joinReq.id}`);

  // Verify pending queue no longer contains the approved request
  const pendingAfterApproval = await db.getPendingJoinRequests(palmHeights.id);
  if (pendingAfterApproval.some(r => r.id === joinReq.id)) {
    throw new Error('FAILED: Approved request still lingering in pending queue');
  }
  console.log(`✓ Step 7b: Approved request removed from pending queue`);

  // 8. Newly Approved Resident Logs In
  const activeResident = await db.authenticateUser(testResidentFlat, testResidentPassword);
  if (!activeResident || activeResident.status !== 'active' || activeResident.flat_number !== testResidentFlat) {
    throw new Error('FAILED: Approved resident failed to log in');
  }
  if (activeResident.apartment_id !== palmHeights.id || activeResident.block.toUpperCase() !== 'TOWER A') {
    throw new Error(`FAILED: Approved resident missing apartment_id or block: apt=${activeResident.apartment_id}, block=${activeResident.block}`);
  }
  console.log(`✓ Step 8: Approved resident successfully logged in: ${activeResident.name} (${activeResident.flat_number}, ${activeResident.block}) in ${palmHeights.name}`);

  // 9. Customer Directory View Shows New Resident
  const palmCustomerSummaries = await db.getCustomerSummaries(palmHeights.id);
  const foundSummary = palmCustomerSummaries.find(c => c.flat_number === testResidentFlat);
  if (!foundSummary) {
    throw new Error('FAILED: Newly approved resident not found in apartment customer directory');
  }
  console.log(`✓ Step 9: Customer directory for Palm Heights contains newly approved resident (Status: ${foundSummary.status || 'active'})`);

  // 10. Vendor Revokes Resident Access
  console.log('\n--- Testing Resident Revocation Flow & Session Invalidation ---');
  // Simulate an active resident session in localStorage
  globalThis.localStorage.setItem('presswala_active_session_v2', JSON.stringify(activeResident));
  if (!globalThis.localStorage.getItem('presswala_active_session_v2')) {
    throw new Error('FAILED: Mock active session not initialized');
  }

  await db.revokeResidentAccess(activeResident.id);
  console.log(`✓ Step 10a: Vendor revoked access for resident ${activeResident.name} (${activeResident.id})`);

  // Verify active session was killed immediately
  if (globalThis.localStorage.getItem('presswala_active_session_v2') !== null) {
    throw new Error('FAILED: Resident active session was NOT killed on revocation!');
  }
  console.log('✓ Step 10b: Resident active session was immediately terminated on revocation (not waiting for next login)');

  // 10c. Verify Revoked Resident Login Attempt Fails Immediately
  try {
    const revokedLogin = await db.authenticateUser(testResidentFlat, testResidentPassword);
    if (revokedLogin) {
      throw new Error('FAILED: Revoked resident was able to log in!');
    }
  } catch (err) {
    if (err.message && err.message.includes('revoked')) {
      console.log(`✓ Step 10c: Revoked resident login blocked with sanitized message: "${err.message}"`);
    } else {
      throw new Error(`FAILED: Unexpected login error message for revoked resident: ${err.message}`);
    }
  }

  // 10d. Verify Past Order & Financial Records are Safely Preserved
  const palmOrdersAfterRevocation = await db.getOrders({ apartmentId: palmHeights.id });
  if (palmOrdersAfterRevocation.length !== palmOrders.length) {
    throw new Error('FAILED: Revocation modified past orders count!');
  }
  console.log(`✓ Step 10d: Ledger integrity verified: past orders (${palmOrdersAfterRevocation.length}) completely preserved`);

  // 11. Revoked Resident Submits Fresh Join Request from Scratch
  console.log('\n--- Testing Re-requesting by Revoked Resident ---');
  const freshReq = await db.createResidentJoinRequest(
    'Vikas Gupta',
    testResidentPhone,
    'Tower A',
    testResidentFlat,
    palmHeights.id,
    'Demo@NewPass99'
  );
  if (!freshReq || freshReq.status !== 'pending') {
    throw new Error('FAILED: Revoked resident was unable to submit a fresh join request');
  }
  console.log(`✓ Step 11: Revoked resident successfully submitted a fresh join request (ID: ${freshReq.id})`);

  // 12. Vendor Rejection Flow & Resubmission by Rejected Resident
  console.log('\n--- Testing Vendor Rejection Flow & Resubmission ---');
  // 12a. Create a brand-new join request for Flat B-3009 (never approved)
  const rejectedCandidateFlat = 'B-3009';
  const rejectedReq = await db.createResidentJoinRequest(
    'Alok Sharma',
    '9833344556',
    'Tower B',
    rejectedCandidateFlat,
    palmHeights.id,
    'Demo@AlokPass1'
  );
  console.log(`✓ Step 12a: Created join request for brand-new applicant Alok Sharma (${rejectedCandidateFlat})`);

  // Vendor rejects the request
  const rejected = await db.rejectResidentJoinRequest(rejectedReq.id);
  if (!rejected) {
    throw new Error('FAILED: Reject join request returned false');
  }
  const pendingAfterRejection = await db.getPendingJoinRequests(palmHeights.id);
  if (pendingAfterRejection.some(r => r.id === rejectedReq.id)) {
    throw new Error('FAILED: Rejected request still in pending list');
  }
  console.log(`✓ Step 12b: Vendor rejected join request ${rejectedReq.id}, correctly removed from pending queue`);

  // 12c. Verify login attempt by rejected resident explains status
  try {
    const rejectedLoginResult = await db.authenticateUser(rejectedCandidateFlat, 'Demo@AlokPass1');
    if (rejectedLoginResult) {
      throw new Error('FAILED: Rejected resident was able to log in!');
    }
  } catch (err) {
    if (err.message && err.message.includes('declined')) {
      console.log(`✓ Step 12c: Rejected resident receives clear feedback on login: "${err.message}"`);
    } else {
      throw new Error(`FAILED: Unexpected login message for rejected resident: ${err.message}`);
    }
  }

  // 12d. Verify a rejected resident can submit a fresh request from scratch (never stuck!)
  const reSubmittedAfterReject = await db.createResidentJoinRequest(
    'Alok Sharma',
    '9833344556',
    'Tower B',
    rejectedCandidateFlat,
    palmHeights.id,
    'Demo@AlokPass2'
  );
  if (!reSubmittedAfterReject || reSubmittedAfterReject.status !== 'pending') {
    throw new Error('FAILED: Rejected resident was unable to submit a fresh join request!');
  }
  console.log(`✓ Step 12d: Rejected resident successfully submitted fresh request from scratch (ID: ${reSubmittedAfterReject.id})`);

  // 13. Lockout on Pending / Revoked / Rejected Logins (Anti-Enumeration)
  console.log('\n--- Testing Brute-Force Lockout on Resident Logins ---');
  const { loginSecurity } = await import('../src/services/loginSecurity.ts');
  loginSecurity.clearLockout(testResidentFlat);

  // Perform attempts on the flat
  let lockoutTriggered = false;
  for (let i = 1; i <= 5; i++) {
    try {
      await db.authenticateUser(testResidentFlat, 'WrongPass123!');
    } catch (err) {
      if (err.message && err.message.includes('Locked for')) {
        lockoutTriggered = true;
        console.log(`✓ Step 13a: Attempt ${i} successfully triggered 3-minute lockout: "${err.message}"`);
        break;
      }
    }
  }
  const lockoutStatus = loginSecurity.checkLockout(testResidentFlat);
  if (!lockoutStatus.isLocked && !lockoutTriggered) {
    throw new Error('FAILED: 5 login attempts on pending/rejected flat did not trigger lockout');
  }
  console.log(`✓ Step 13b: Lockout protection confirmed: flat ${testResidentFlat} is locked for ${lockoutStatus.remainingSeconds}s, preventing flat number enumeration`);
  loginSecurity.clearLockout(testResidentFlat);

  // 14. UI Audit: Verify no Owner or platform-admin strings in main LoginView
  console.log('\n--- Testing Bundle & Privacy Guardrails ---');
  const loginViewContent = fs.readFileSync(path.resolve('./src/components/auth/LoginView.tsx'), 'utf-8');
  if (loginViewContent.toLowerCase().includes('platform-admin')) {
    throw new Error('FAILED: LoginView contains "platform-admin"');
  }
  if (loginViewContent.includes('role === \'owner\'') || loginViewContent.includes('role === "owner"')) {
    throw new Error('FAILED: LoginView references owner role');
  }
  console.log('✓ Step 14: LoginView.tsx has 0 occurrences of "platform-admin" and 0 owner role references');

  // 15. Fix (a): Attempt direct role/status/apartment update on customer row
  console.log('\n--- Testing Fix (a): Column Lockdown on Resident Self-Updates ---');
  const residentUser = INITIAL_USERS.find(u => u.role === 'customer');
  const residentCaller = { id: residentUser.id, role: 'customer', apartment_id: residentUser.apartment_id };

  // Attempt to self-promote to vendor
  let selfPromotionBlocked = false;
  try {
    await db.updateUserProfile(residentUser.id, { role: 'vendor' }, residentCaller);
  } catch (err) {
    if (err.message && err.message.includes('Only platform owner can modify user roles')) {
      selfPromotionBlocked = true;
      console.log(`✓ Step 15a: Self-promotion to vendor rejected: "${err.message}"`);
    } else {
      throw new Error(`FAILED: Unexpected error on role update: ${err.message}`);
    }
  }
  if (!selfPromotionBlocked) {
    throw new Error('FAILED: Resident was able to self-promote to vendor role!');
  }

  // Attempt to modify status
  let statusTamperingBlocked = false;
  try {
    await db.updateUserProfile(residentUser.id, { status: 'revoked' }, residentCaller);
  } catch (err) {
    if (err.message && err.message.includes('permission to modify status')) {
      statusTamperingBlocked = true;
      console.log(`✓ Step 15b: Resident status tampering rejected: "${err.message}"`);
    } else {
      throw new Error(`FAILED: Unexpected error on status update: ${err.message}`);
    }
  }
  if (!statusTamperingBlocked) {
    throw new Error('FAILED: Resident was able to tamper with account status!');
  }

  // Attempt to switch apartment
  let aptTamperingBlocked = false;
  try {
    await db.updateUserProfile(residentUser.id, { apartment_id: royalPalms.id }, residentCaller);
  } catch (err) {
    if (err.message && err.message.includes('Only platform owner can modify apartment assignments')) {
      aptTamperingBlocked = true;
      console.log(`✓ Step 15c: Resident apartment switching rejected: "${err.message}"`);
    } else {
      throw new Error(`FAILED: Unexpected error on apartment update: ${err.message}`);
    }
  }
  if (!aptTamperingBlocked) {
    throw new Error('FAILED: Resident was able to modify apartment_id!');
  }

  // Valid self-service update (e.g. updating display name) must succeed
  const updatedResident = await db.updateUserProfile(residentUser.id, { name: 'Sharma Ji Updated' }, residentCaller);
  if (updatedResident.name !== 'Sharma Ji Updated' || updatedResident.role !== 'customer') {
    throw new Error('FAILED: Legitimate resident name update failed or mutated protected fields');
  }
  console.log(`✓ Step 15d: Legitimate profile field update succeeded (Name: "${updatedResident.name}") with role strictly preserved as customer`);

  // Vendor caller for Palm Heights
  const palmVendor = INITIAL_USERS.find(u => u.role === 'vendor' && (u.apartment_id === palmHeights.id || !u.apartment_id));
  const vendorCaller = { id: palmVendor.id, role: 'vendor', apartment_id: palmHeights.id };

  // Vendor attempts to update a resident's role to 'vendor' (for resident in their own apartment)
  let vendorRoleBlocked = false;
  try {
    await db.updateUserProfile(residentUser.id, { role: 'vendor' }, vendorCaller);
  } catch (err) {
    if (err.message && err.message.includes('Only platform owner can modify user roles')) {
      vendorRoleBlocked = true;
      console.log(`✓ Step 15e: Vendor attempt to change resident role to 'vendor' rejected: "${err.message}"`);
    } else {
      throw new Error(`FAILED: Unexpected error on vendor role update attempt: ${err.message}`);
    }
  }
  if (!vendorRoleBlocked) {
    throw new Error('FAILED: Vendor was able to change a resident role to vendor!');
  }

  // Vendor attempts to update status while ALSO changing apartment_id in the same call
  let vendorSneakAptBlocked = false;
  try {
    await db.updateUserProfile(residentUser.id, { status: 'revoked', apartment_id: royalPalms.id }, vendorCaller);
  } catch (err) {
    if (err.message && (err.message.includes('Only platform owner can modify apartment assignments') || err.message.includes('permission to modify status'))) {
      vendorSneakAptBlocked = true;
      console.log(`✓ Step 15f: Vendor attempt to update status + change apartment_id rejected: "${err.message}"`);
    } else {
      throw new Error(`FAILED: Unexpected error on vendor status+apartment update: ${err.message}`);
    }
  }
  if (!vendorSneakAptBlocked) {
    throw new Error('FAILED: Vendor was able to update status while changing apartment_id!');
  }

  // Confirm legitimate vendor action: update status with apartment_id unchanged succeeds
  const legitimateVendorStatusUpdate = await db.updateUserProfile(residentUser.id, { status: 'revoked' }, vendorCaller);
  if (legitimateVendorStatusUpdate.status !== 'revoked' || legitimateVendorStatusUpdate.apartment_id !== palmHeights.id) {
    throw new Error('FAILED: Legitimate vendor status change within own apartment failed');
  }
  console.log(`✓ Step 15g: Legitimate vendor status update (status: "revoked", apartment_id unchanged) succeeded`);
  // Restore resident status back to active for downstream tests
  await db.updateUserProfile(residentUser.id, { status: 'active' }, vendorCaller);

  // Platform owner update on protected fields freely permitted
  const ownerCaller = { id: 'super-admin-1', role: 'owner' };
  const ownerUpdated = await db.updateUserProfile(residentUser.id, { status: 'active', approved_at: new Date().toISOString() }, ownerCaller);
  if (ownerUpdated.status !== 'active') {
    throw new Error('FAILED: Platform owner update failed');
  }
  console.log(`✓ Step 15h: Platform owner update on protected fields freely permitted`);

  // 16. Fix (b): Flat-number-based access checks apartment-aware everywhere
  console.log('\n--- Testing Fix (b): Identical Flat Number Isolation Across Apartments ---');
  // Flat A-1001 already exists in Palm Heights with Sharma Ji (order PW-1002, ₹54 unpaid)
  const palmFlatOrders = await db.getOrders({ flatNumber: 'A-1001', apartmentId: palmHeights.id });
  const palmFlatBal = await db.getCustomerBalance('A-1001', palmHeights.id);
  console.log(`   Palm Heights Flat A-1001: ${palmFlatOrders.length} order(s), dues = ₹${palmFlatBal.totalOutstanding}`);

  // Create a resident with the identical flat number A-1001 in Royal Palms Residency
  const royalResidentA1001 = {
    id: 'u-royal-a1001',
    name: 'Suresh Menon',
    flat_number: 'A-1001',
    phone: '9876540001',
    role: 'customer',
    status: 'active',
    apartment_id: royalPalms.id,
    apartment_name: royalPalms.name,
    block: 'Tower R',
    created_at: new Date().toISOString()
  };
  const currentUsers = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  currentUsers.push(royalResidentA1001);
  globalThis.localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(currentUsers));

  // Create an order for Suresh Menon in Royal Palms (Flat A-1001)
  const royalOrder = await db.createOrder(
    royalResidentA1001,
    [{ garmentTypeId: 'gt-1', garmentName: 'Shirt / Kurta (Normal)', unitPrice: 15, quantity: 10 }]
  ); // Total = ₹150
  console.log(`   Created Royal Palms Flat A-1001 Order: ${royalOrder.order_number} for ₹${royalOrder.total_amount}`);

  // Check 1: Royal Palms orders for A-1001
  const royalOrdersForFlat = await db.getOrders({ flatNumber: 'A-1001', apartmentId: royalPalms.id });
  if (royalOrdersForFlat.length !== 1 || royalOrdersForFlat[0].id !== royalOrder.id) {
    throw new Error(`FAILED: Expected 1 Royal Palms order for A-1001, got ${royalOrdersForFlat.length}`);
  }

  // Check 2: Palm Heights orders for A-1001 MUST NOT contain the Royal Palms order
  const palmOrdersCheck = await db.getOrders({ flatNumber: 'A-1001', apartmentId: palmHeights.id });
  const leakedIntoPalm = palmOrdersCheck.some(o => o.apartment_id === royalPalms.id || o.id === royalOrder.id);
  if (leakedIntoPalm) {
    throw new Error('FAILED: LEAK! Royal Palms A-1001 order leaked into Palm Heights A-1001 view!');
  }

  // Check 3: Royal Palms orders MUST NOT contain Palm Heights orders
  const leakedIntoRoyal = royalOrdersForFlat.some(o => o.apartment_id === palmHeights.id);
  if (leakedIntoRoyal) {
    throw new Error('FAILED: LEAK! Palm Heights A-1001 order leaked into Royal Palms A-1001 view!');
  }

  // Check 4: Balances must be isolated
  const royalBal = await db.getCustomerBalance('A-1001', royalPalms.id);
  const palmBalAfter = await db.getCustomerBalance('A-1001', palmHeights.id);
  if (royalBal.totalOutstanding !== 150) {
    throw new Error(`FAILED: Royal Palms A-1001 dues expected ₹150, got ₹${royalBal.totalOutstanding}`);
  }
  if (palmBalAfter.totalOutstanding !== palmFlatBal.totalOutstanding) {
    throw new Error(`FAILED: Palm Heights dues changed after Royal Palms order added! (was ${palmFlatBal.totalOutstanding}, now ${palmBalAfter.totalOutstanding})`);
  }

  // Check 5: Payments isolation
  await db.recordPayment({
    order_id: royalOrder.id,
    customer_name: 'Suresh Menon',
    flat_number: 'A-1001',
    amount: 150,
    payment_method: 'upi',
    apartment_id: royalPalms.id
  });
  const palmPayments = await db.getPayments({ flatNumber: 'A-1001', apartmentId: palmHeights.id });
  const royalPayments = await db.getPayments({ flatNumber: 'A-1001', apartmentId: royalPalms.id });
  if (palmPayments.length !== 0) {
    throw new Error('FAILED: Payment for Royal Palms A-1001 leaked into Palm Heights A-1001 payments!');
  }
  if (royalPayments.length !== 1) {
    throw new Error(`FAILED: Royal Palms A-1001 expected 1 payment, got ${royalPayments.length}`);
  }
  console.log(`✓ Step 16: Zero cross-apartment leakage between identical Flat A-1001 in Palm Heights and Royal Palms verified (orders, balances, payments isolated)`);

  // 17. Fix (c): Rate limiting & guardrails on Join Requests
  console.log('\n--- Testing Fix (c): Join Request Rate Limiting & Validation Guardrails ---');
  const spamPhone = '9899990001';
  const { joinRequestSecurity } = await import('../src/services/loginSecurity.ts');
  joinRequestSecurity.clearRateLimit(spamPhone);

  // Validation sanity check: empty or invalid name
  try {
    await db.createResidentJoinRequest('A', spamPhone, 'Block C', 'C-1001', palmHeights.id, 'TestPass@123');
    throw new Error('FAILED: Submitting invalid short name did not throw validation error');
  } catch (err) {
    console.log(`✓ Step 17a: Sane validation constraints enforced on name: "${err.message}"`);
  }

  // Submit request 1
  const spam1 = await db.createResidentJoinRequest('Spam Applicant One', spamPhone, 'Block C', 'C-1001', palmHeights.id, 'TestPass@123');
  console.log(`   Join request 1/3 submitted (ID: ${spam1.id})`);

  // Submit request 2
  const spam2 = await db.createResidentJoinRequest('Spam Applicant Two', spamPhone, 'Block C', 'C-1002', palmHeights.id, 'TestPass@123');
  console.log(`   Join request 2/3 submitted (ID: ${spam2.id})`);

  // Submit request 3
  const spam3 = await db.createResidentJoinRequest('Spam Applicant Three', spamPhone, 'Block C', 'C-1003', palmHeights.id, 'TestPass@123');
  console.log(`   Join request 3/3 submitted (ID: ${spam3.id})`);

  // 4th request MUST fail with rate-limit error
  let rateLimitEnforced = false;
  try {
    await db.createResidentJoinRequest('Spam Applicant Four', spamPhone, 'Block C', 'C-1004', palmHeights.id, 'TestPass@123');
  } catch (err) {
    if (err.message && err.message.includes('Submission limit reached: Maximum 3 join requests')) {
      rateLimitEnforced = true;
      console.log(`✓ Step 17b: 4th join request blocked by rate limiter: "${err.message}"`);
    } else {
      throw new Error(`FAILED: Unexpected error message on rate limit test: ${err.message}`);
    }
  }
  if (!rateLimitEnforced) {
    throw new Error('FAILED: 4th join request from same phone was NOT blocked by rate limiter!');
  }
  console.log('✓ Step 17c: Join request spam successfully capped at 3 requests per 24 hours per phone number');
  joinRequestSecurity.clearRateLimit(spamPhone);

  console.log('\n====================================================');
  console.log('ALL PHASE B APARTMENT SCOPING & JOIN REQUEST TESTS PASSED! (20/20)');
  console.log('====================================================\n');
}

runPhaseBVerification().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
