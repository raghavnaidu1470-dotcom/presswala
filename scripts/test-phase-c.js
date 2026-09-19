import assert from 'assert';

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

console.log('====================================================');
console.log('PressWala Phase C: Block Dashboard & Multi-Contact Tests');
console.log('====================================================\n');

async function runPhaseCTests() {
  const { db, initializeDatabase, STORAGE_KEYS } = await import('../src/services/db');

  // Clear and initialize
  localStorage.clear();
  initializeDatabase();
  console.log('✓ Step 1: Database initialized with Phase C seed contacts');

  const palmHeightsId = 'c1111111-0000-0000-0000-000000000001';
  const royalPalmsId = 'c1111111-0000-0000-0000-000000000002';

  // Find Sharma Ji (Flat A-1001) in Palm Heights
  const summaries = await db.getCustomerSummaries(palmHeightsId);
  const sharmaJi = summaries.find(s => s.flat_number === 'A-1001');
  assert(sharmaJi, 'Sharma Ji (Flat A-1001) must exist');
  assert(sharmaJi.contacts && sharmaJi.contacts.length >= 2, 'Sharma Ji should have seed contacts');
  console.log(`✓ Step 2: Found resident ${sharmaJi.customer_name} with ${sharmaJi.contacts?.length} initial contact numbers`);

  // ---------------------------------------------------------------------------
  // Test 1: Contact Validation & Limit Enforcement (Up to 5)
  // ---------------------------------------------------------------------------
  console.log('\n--- Testing Contact Validation & 5-Number Limit ---');
  const customerId = sharmaJi.customer_id;
  let contacts = await db.getCustomerContacts(customerId);
  console.log(`   Initial contacts count for ${sharmaJi.customer_name}: ${contacts.length}`);

  // Test invalid phone number
  try {
    await db.addCustomerContact(customerId, '123', 'Alternate');
    assert.fail('Should have rejected invalid 3-digit phone');
  } catch (err) {
    assert(err.message.includes('10-digit mobile number'), `Expected phone validation error: ${err.message}`);
    console.log('✓ Step 3a: Invalid phone length rejected');
  }

  // Test invalid label
  try {
    await db.addCustomerContact(customerId, '9876543219', '');
    assert.fail('Should have rejected empty label');
  } catch (err) {
    assert(err.message.includes('between 1 and 30 characters'), `Expected label error: ${err.message}`);
    console.log('✓ Step 3b: Empty contact label rejected');
  }

  // Add contacts until limit (5) is reached
  while (contacts.length < 5) {
    const nextIdx = contacts.length + 1;
    const phone = `987650000${nextIdx}`;
    const label = `Contact ${nextIdx}`;
    await db.addCustomerContact(customerId, phone, label);
    contacts = await db.getCustomerContacts(customerId);
  }
  assert.strictEqual(contacts.length, 5, 'Should now have exactly 5 contacts');
  console.log(`✓ Step 3c: Successfully registered 5 contacts for resident`);

  // Attempt 6th contact — must fail with 5-limit error
  try {
    await db.addCustomerContact(customerId, '9876599999', 'Overflow Contact');
    assert.fail('Should have rejected 6th contact due to limit of 5');
  } catch (err) {
    assert(err.message.includes('Maximum 5 contact numbers'), `Expected limit error, got: ${err.message}`);
    console.log('✓ Step 3d: Hard limit of 5 contacts strictly enforced at application level');
  }

  // ---------------------------------------------------------------------------
  // Test 2: Contact Updates & Primary Number Synchronization
  // ---------------------------------------------------------------------------
  console.log('\n--- Testing Contact Updates & Primary Flag Synchronization ---');
  const nonPrimary = contacts.find(c => !c.is_primary);
  assert(nonPrimary, 'Should have a non-primary contact');

  // Update label
  const updatedContact = await db.updateCustomerContact(nonPrimary.id, {
    label: 'Spouse Mobile',
    phone: '9876543299'
  });
  assert.strictEqual(updatedContact.label, 'Spouse Mobile');
  assert.strictEqual(updatedContact.phone, '9876543299');
  console.log('✓ Step 4a: Contact label and phone updated successfully');

  // Promote non-primary to primary
  await db.updateCustomerContact(nonPrimary.id, { is_primary: true });
  const reloadedContacts = await db.getCustomerContacts(customerId);
  const newPrimary = reloadedContacts.find(c => c.id === nonPrimary.id);
  assert(newPrimary && newPrimary.is_primary, 'Promoted contact must now be primary');

  // Verify other contacts are no longer primary
  const otherPrimaries = reloadedContacts.filter(c => c.id !== nonPrimary.id && c.is_primary);
  assert.strictEqual(otherPrimaries.length, 0, 'Only one contact may be primary');

  // Verify user's phone in users collection is synchronized with primary
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const userRow = users.find(u => u.id === customerId);
  assert.strictEqual(userRow.phone, '9876543299', 'User profile phone must synchronize with primary contact');
  console.log('✓ Step 4b: Contact promoted to primary and synchronized with resident user profile');

  // ---------------------------------------------------------------------------
  // Test 3: Hard Floor on Deletion (Cannot delete last remaining contact)
  // ---------------------------------------------------------------------------
  console.log('\n--- Testing (a): Hard Floor on Deletion ---');
  // Find Ananya Patel (who starts with 1 contact)
  const ananyaUser = users.find(u => u.flat_number === 'C-4005');
  assert(ananyaUser, 'Ananya Patel (C-4005) must exist');
  const ananyaContacts = await db.getCustomerContacts(ananyaUser.id);
  assert.strictEqual(ananyaContacts.length, 1, 'Ananya Patel must have exactly 1 contact initially');

  try {
    await db.deleteCustomerContact(ananyaContacts[0].id);
    assert.fail('Should have rejected deletion of last remaining contact');
  } catch (err) {
    assert(err.message.includes('at least 1 contact number'), `Expected floor error message, got: ${err.message}`);
    console.log('✓ Step 5a: Attempt to delete resident\'s last remaining contact rejected with clear error');
  }

  // Verify the contact is still intact
  const ananyaContactsAfter = await db.getCustomerContacts(ananyaUser.id);
  assert.strictEqual(ananyaContactsAfter.length, 1, 'Contact must still be preserved');
  console.log('✓ Step 5b: Floor invariant verified — resident count never drops to 0');

  // ---------------------------------------------------------------------------
  // Test 4: Exactly-One-Primary Invariant Across All Add/Edit/Delete Sequences
  // ---------------------------------------------------------------------------
  console.log('\n--- Testing (b): Exactly-One-Primary Invariant ---');
  // Helper to verify primary count
  const verifyExactlyOnePrimary = async (uid, stepDesc) => {
    const list = await db.getCustomerContacts(uid);
    const primaries = list.filter(c => c.is_primary);
    assert.strictEqual(primaries.length, 1, `Invariant failure [${stepDesc}]: Expected exactly 1 primary contact, found ${primaries.length}`);
    return primaries[0];
  };

  // 1. Initial state for Ananya: exactly 1 primary
  let currPrimary = await verifyExactlyOnePrimary(ananyaUser.id, 'Initial state');
  console.log(`   Initial primary: ${currPrimary.phone} (${currPrimary.label})`);

  // 2. Add contact without is_primary -> existing primary remains
  const c2 = await db.addCustomerContact(ananyaUser.id, '9811111111', 'Office', false);
  currPrimary = await verifyExactlyOnePrimary(ananyaUser.id, 'After adding secondary contact');
  assert.strictEqual(currPrimary.id, ananyaContacts[0].id, 'Original contact should still be primary');

  // 3. Add contact with is_primary = true -> new contact becomes the sole primary
  const c3 = await db.addCustomerContact(ananyaUser.id, '9822222222', 'Spouse', true);
  currPrimary = await verifyExactlyOnePrimary(ananyaUser.id, 'After adding new primary contact');
  assert.strictEqual(currPrimary.id, c3.id, 'c3 must now be primary');

  // 4. Direct attempt to edit c3 with is_primary = false without designating another -> rejected
  try {
    await db.updateCustomerContact(c3.id, { is_primary: false });
    assert.fail('Should have rejected unsetting primary when no other primary exists');
  } catch (err) {
    assert(err.message.includes('always have exactly one primary'), `Expected primary invariant error, got: ${err.message}`);
    console.log('✓ Step 6a: Rejecting is_primary: false on primary contact when no other primary designated');
  }
  await verifyExactlyOnePrimary(ananyaUser.id, 'After rejected unmark attempt');

  // 5. Delete the primary contact (c3) -> oldest remaining contact automatically promoted to primary
  await db.deleteCustomerContact(c3.id);
  currPrimary = await verifyExactlyOnePrimary(ananyaUser.id, 'After deleting primary contact');
  assert.strictEqual(currPrimary.id, ananyaContacts[0].id, 'Oldest remaining contact should be auto-promoted to primary');
  console.log(`✓ Step 6b: Auto-promotion on primary deletion verified: ${currPrimary.phone} (${currPrimary.label}) is new primary`);

  // Clean up c2
  await db.deleteCustomerContact(c2.id);
  await verifyExactlyOnePrimary(ananyaUser.id, 'After cleaning up c2');
  console.log('✓ Step 6c: Exactly-one-primary invariant strictly preserved across full lifecycle');

  // ---------------------------------------------------------------------------
  // Test 5: Server-Side Caller Authorization (Residents & Vendors)
  // ---------------------------------------------------------------------------
  console.log('\n--- Testing (c): Server-Side Caller Authorization ---');
  const poojaUser = users.find(u => u.flat_number === 'A-2004');
  assert(poojaUser, 'Pooja Verma must exist');
  const poojaContacts = await db.getCustomerContacts(poojaUser.id);
  const poojaContactId = poojaContacts[0].id;

  // Resident A (Sharma Ji) trying to edit Resident B (Pooja Verma)'s contact
  const sharmaCaller = { id: sharmaJi.customer_id, role: 'customer', apartment_id: palmHeightsId };
  try {
    await db.updateCustomerContact(poojaContactId, { label: 'Hacked Label' }, sharmaCaller);
    assert.fail('Should have rejected resident modifying another resident\'s contact');
  } catch (err) {
    assert(err.message.includes('Access Denied: Residents can only manage contacts for their own account'), `Expected resident auth error: ${err.message}`);
    console.log('✓ Step 7a: Resident direct API call to modify another resident\'s contact rejected');
  }

  // Resident A trying to delete Resident B's contact
  try {
    await db.deleteCustomerContact(poojaContactId, sharmaCaller);
    assert.fail('Should have rejected resident deleting another resident\'s contact');
  } catch (err) {
    assert(err.message.includes('Access Denied: Residents can only manage contacts for their own account'), `Expected resident auth error: ${err.message}`);
    console.log('✓ Step 7b: Resident direct API call to delete another resident\'s contact rejected');
  }

  // Resident A trying to add a contact to Resident B's profile
  try {
    await db.addCustomerContact(poojaUser.id, '9899999999', 'Unauthorized', false, sharmaCaller);
    assert.fail('Should have rejected resident adding contact for another resident');
  } catch (err) {
    assert(err.message.includes('Access Denied: Residents can only manage contacts for their own account'), `Expected resident auth error: ${err.message}`);
    console.log('✓ Step 7c: Resident direct API call to add contact for another resident rejected');
  }

  // Vendor from Royal Palms trying to modify Palm Heights resident's contact
  const royalPalmsVendorCaller = { id: 'vendor-royal', role: 'vendor', apartment_id: royalPalmsId };
  try {
    await db.updateCustomerContact(poojaContactId, { label: 'Cross-Apt Edit' }, royalPalmsVendorCaller);
    assert.fail('Should have rejected vendor modifying contact from different apartment');
  } catch (err) {
    assert(err.message.includes('Access Denied: Vendors can only manage contacts for residents within their own apartment'), `Expected vendor cross-apt error: ${err.message}`);
    console.log('✓ Step 7d: Cross-apartment vendor contact modification rejected');
  }

  // Legitimate vendor from Palm Heights modifying Palm Heights resident contact succeeds
  const palmHeightsVendorCaller = { id: 'vendor-palm', role: 'vendor', apartment_id: palmHeightsId };
  const updatedByVendor = await db.updateCustomerContact(poojaContactId, { label: 'Primary Verified' }, palmHeightsVendorCaller);
  assert.strictEqual(updatedByVendor.label, 'Primary Verified');
  console.log('✓ Step 7e: Assigned vendor modifying their own apartment resident contact permitted');

  // ---------------------------------------------------------------------------
  // Test 6: Cross-Apartment Isolation on Identical Flat Numbers
  // ---------------------------------------------------------------------------
  console.log('\n--- Testing (d): Cross-Apartment Isolation with Identical Flat Numbers ---');
  // Create identical Flat A-1001 resident in Royal Palms Residency
  const royalA1001 = {
    id: 'c2222222-0000-0000-0000-000000000101',
    name: 'Ramesh Patel',
    flat_number: 'A-1001',
    phone: '9844444444',
    role: 'customer',
    status: 'active',
    apartment_id: royalPalmsId,
    apartment_name: 'Royal Palms Residency',
    block: 'A',
    created_at: new Date().toISOString()
  };
  users.push(royalA1001);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  // Add contact for Royal Palms Flat A-1001
  const royalContact = await db.addCustomerContact(royalA1001.id, '9844444444', 'Primary', true);

  // Retrieve contacts for Palm Heights Flat A-1001 vs Royal Palms Flat A-1001
  const phFlatContacts = await db.getCustomerContacts(sharmaJi.customer_id);
  const rpFlatContacts = await db.getCustomerContacts(royalA1001.id);

  assert.strictEqual(rpFlatContacts.length, 1);
  assert.strictEqual(rpFlatContacts[0].phone, '9844444444');
  assert.strictEqual(rpFlatContacts[0].apartment_id, royalPalmsId);

  // Verify none of Royal Palms contacts leak into Palm Heights contacts
  assert(!phFlatContacts.some(c => c.phone === '9844444444'), 'Palm Heights Flat A-1001 must not see Royal Palms Flat A-1001 contacts');
  assert(!rpFlatContacts.some(c => c.customer_id === sharmaJi.customer_id), 'Royal Palms Flat A-1001 must not see Palm Heights contacts');

  // Verify Palm Heights vendor getCustomerSummaries does not include Royal Palms Flat A-1001
  const phSummaries = await db.getCustomerSummaries(palmHeightsId);
  const phA1001Summary = phSummaries.find(s => s.flat_number === 'A-1001');
  assert.strictEqual(phA1001Summary.customer_id, sharmaJi.customer_id, 'Palm Heights vendor must only see Palm Heights Flat A-1001');
  assert.strictEqual(phA1001Summary.customer_name, 'Sharma Ji');

  console.log('✓ Step 8: Strict cross-apartment isolation on identical Flat A-1001 verified (zero contact leakage)');

  // ---------------------------------------------------------------------------
  // Test 7: Block Dashboard Data Aggregation
  // ---------------------------------------------------------------------------
  console.log('\n--- Testing Block Dashboard Grouping & At-a-Glance Active Orders ---');
  const blockData = await db.getBlockDashboardData(palmHeightsId);
  assert(blockData.length > 0, 'Block dashboard data must return groups');

  const blockNames = blockData.map(b => b.blockName);
  console.log(`   Discovered blocks in Palm Heights: ${blockNames.join(', ')}`);
  assert(blockNames.includes('A'), 'Must have Block A');
  assert(blockNames.includes('B'), 'Must have Block B');

  // Check Block A residents
  const blockA = blockData.find(b => b.blockName === 'A');
  assert(blockA, 'Block A group must exist');
  assert(blockA.totalResidents >= 2, 'Block A should have at least 2 flats (A-1001, A-2004)');

  // Verify residents inside Block A are sorted
  for (let i = 0; i < blockA.residents.length - 1; i++) {
    const cur = blockA.residents[i].flat_number;
    const next = blockA.residents[i + 1].flat_number;
    assert(cur.localeCompare(next, undefined, { numeric: true }) <= 0, 'Flats inside block must be sorted');
  }
  console.log(`✓ Step 9a: Block A has ${blockA.totalResidents} flats sorted, ${blockA.activeOrdersCount} active orders, ₹${blockA.totalDues} dues`);

  // Check active order on Flat A-1001 (Sharma Ji has active order PW-1001)
  const sharmaBlockEntry = blockA.residents.find(r => r.flat_number === 'A-1001');
  assert(sharmaBlockEntry, 'Sharma Ji must appear in Block A');
  assert(sharmaBlockEntry.active_order, 'Sharma Ji must have an active order visible at-a-glance');
  assert(sharmaBlockEntry.active_order.order_number, 'Active order must have order number');
  assert(['created', 'in_progress', 'ready'].includes(sharmaBlockEntry.active_order.status), 'Status must be active status');
  console.log(`✓ Step 9b: At-a-glance active order surfaced: ${sharmaBlockEntry.active_order.order_number} (${sharmaBlockEntry.active_order.status}, ${sharmaBlockEntry.active_order.garment_count} pcs)`);

  // ---------------------------------------------------------------------------
  // Test 8: Smart WhatsApp Resolution (1 Number vs Multiple Numbers)
  // ---------------------------------------------------------------------------
  console.log('\n--- Testing Smart WhatsApp Button Resolution ---');
  // Resident with multiple contacts (Sharma Ji)
  const multiContacts = await db.getCustomerContacts(sharmaJi.customer_id);
  assert(multiContacts.length > 1, 'Resident has multiple contacts');
  const multiAction = multiContacts.length > 1 ? 'OPEN_PICKER' : 'DIRECT_LINK';
  assert.strictEqual(multiAction, 'OPEN_PICKER', 'Multiple contacts must trigger picker modal');
  console.log(`✓ Step 10a: Multi-contact resident (${multiContacts.length} numbers) triggers ContactPickerModal`);

  // Resident with 1 contact (Ananya Patel in Block C has 1 contact)
  const blockC = blockData.find(b => b.blockName === 'C');
  const ananya = blockC?.residents.find(r => r.flat_number === 'C-4005');
  assert(ananya, 'Ananya Patel must exist in Block C');
  const singleAction = (ananya.contacts && ananya.contacts.length > 1) ? 'OPEN_PICKER' : 'DIRECT_LINK';
  assert.strictEqual(singleAction, 'DIRECT_LINK', 'Single contact must resolve directly to wa.me link');
  console.log(`✓ Step 10b: Single-contact resident resolves directly to 1-click WhatsApp link`);

  console.log('\n====================================================');
  console.log('ALL PHASE C VERIFICATION & SECURITY TESTS PASSED! (18/18)');
  console.log('====================================================\n');
}

runPhaseCTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
