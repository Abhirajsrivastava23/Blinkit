import { db } from '../src/data/db';
import { hashPassword, verifyPassword, createSession } from '../src/data/auth';

async function runTests() {
  console.log('=====================================================');
  console.log('🧪 RUNNING PRODUCTION TEST SUITE: DELIVERY PARTNER CREATION & LOGIN');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Seed / Initial Partners Existence
    // -------------------------------------------------------------
    console.log('--- Test Group 1: Seed Partners Initial State ---');
    const initialPartners = await db.getPartners();
    console.log(`Found ${initialPartners.length} existing partners in database.`);
    assert(initialPartners.length >= 1, 'Initial partners exist in database');

    const seedPartner = await db.getPartnerById('DP-001');
    assert(Boolean(seedPartner), 'Seed partner DP-001 retrieved');
    assert(seedPartner?.role === 'delivery_partner', 'Seed partner has role delivery_partner');

    // -------------------------------------------------------------
    // Test 2: Admin Creates New Delivery Partner
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: Create New Delivery Partner in Database ---');
    const uniqueTestEmail = `test.rider.${Date.now()}@fatafat.com`;
    const testPassword = 'RiderSecret@2026';
    const newPartnerId = `DP-${Date.now().toString().slice(-4)}`;

    const createdPartner = await db.upsertPartner({
      id: newPartnerId,
      name: 'Rohan Deshmukh',
      phone: '9876543299',
      email: uniqueTestEmail,
      passwordHash: hashPassword(testPassword),
      role: 'delivery_partner',
      locationId: 'nawabganj-unnao',
      locationName: 'Nawabganj, Unnao',
      status: 'Active',
      isOnline: false
    });

    assert(Boolean(createdPartner), 'Partner upsert completed');
    assert(createdPartner.id === newPartnerId, `Partner created with ID: ${newPartnerId}`);
    assert(createdPartner.name === 'Rohan Deshmukh', 'Partner name matches');
    assert(createdPartner.email === uniqueTestEmail.toLowerCase(), 'Partner email is normalized to lowercase');
    assert(createdPartner.status === 'Active', 'Partner status is Active');

    // -------------------------------------------------------------
    // Test 3: Verify Partner in Database Listing
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Verify Partner in getPartners List ---');
    const allPartners = await db.getPartners();
    const foundInList = allPartners.find(p => p.id === newPartnerId);
    assert(Boolean(foundInList), 'Newly created partner immediately appears in getPartners list');
    assert(foundInList?.name === 'Rohan Deshmukh', 'Name in list matches');
    assert(foundInList?.phone === '9876543299', 'Phone in list matches');
    assert(foundInList?.email === uniqueTestEmail.toLowerCase(), 'Email in list matches');

    // -------------------------------------------------------------
    // Test 4: Verify Partner Lookup by Identifier
    // -------------------------------------------------------------
    console.log('\n--- Test Group 4: Lookup Partner by ID, Email, and Phone ---');
    const byId = await db.getPartnerById(newPartnerId);
    assert(Boolean(byId), 'Partner found by ID');

    const byEmail = await db.getPartnerById(uniqueTestEmail);
    assert(Boolean(byEmail), 'Partner found by Email');

    const byEmailUpper = await db.getPartnerById(uniqueTestEmail.toUpperCase());
    assert(Boolean(byEmailUpper), 'Partner found by UPPERCASE Email (case-insensitive)');

    const byPhone = await db.getPartnerById('9876543299');
    assert(Boolean(byPhone), 'Partner found by 10-digit Phone number');

    // -------------------------------------------------------------
    // Test 5: Password Verification with Exact Credentials
    // -------------------------------------------------------------
    console.log('\n--- Test Group 5: Password Authentication Verification ---');
    const storedHash = String(byEmail?.passwordHash || byEmail?.passwordhash || '');
    assert(Boolean(storedHash), 'Stored password hash is present');
    assert(verifyPassword(testPassword, storedHash), 'Exact password matches stored hash');
    assert(!verifyPassword('WrongPassword123', storedHash), 'Incorrect password correctly rejected');
    assert(!verifyPassword('', storedHash), 'Empty password correctly rejected');

    // -------------------------------------------------------------
    // Test 6: Delivery Partner Session Creation & Role
    // -------------------------------------------------------------
    console.log('\n--- Test Group 6: Session Creation for Delivery Partner ---');
    const session = await createSession(newPartnerId, uniqueTestEmail, 'delivery_partner');
    assert(Boolean(session.sessionId), `Session generated: ${session.sessionId.slice(0, 15)}...`);
    assert(session.userId === newPartnerId, 'Session userId matches partner ID');
    assert(session.email === uniqueTestEmail.toLowerCase(), 'Session email matches partner email');
    assert(session.role === 'delivery_partner', 'Session role is strictly delivery_partner');

    // -------------------------------------------------------------
    // Test 7: Inactive Partner Handling
    // -------------------------------------------------------------
    console.log('\n--- Test Group 7: Inactive Partner Suspension ---');
    const inactivePartnerId = `DP-INACTIVE-${Date.now().toString().slice(-4)}`;
    const inactiveEmail = `inactive.${Date.now()}@fatafat.com`;
    await db.upsertPartner({
      id: inactivePartnerId,
      name: 'Suspended Rider',
      phone: '9876500000',
      email: inactiveEmail,
      passwordHash: hashPassword('anyPassword123'),
      role: 'delivery_partner',
      status: 'Inactive',
      isOnline: false
    });

    const inactiveLookup = await db.getPartnerById(inactivePartnerId);
    assert(inactiveLookup?.status === 'Inactive', 'Inactive status saved correctly');

    // -------------------------------------------------------------
    // Test 8: Password Reset / Update Flow
    // -------------------------------------------------------------
    console.log('\n--- Test Group 8: Password Reset Flow ---');
    const newResetPassword = 'NewRiderPassword@2027';
    await db.upsertPartner({
      id: newPartnerId,
      name: 'Rohan Deshmukh',
      email: uniqueTestEmail,
      passwordHash: hashPassword(newResetPassword),
      status: 'Active'
    });

    const refreshedPartner = await db.getPartnerById(newPartnerId);
    const refreshedHash = String(refreshedPartner?.passwordHash || refreshedPartner?.passwordhash || '');
    assert(verifyPassword(newResetPassword, refreshedHash), 'New password verifies successfully');
    assert(!verifyPassword(testPassword, refreshedHash), 'Old password is no longer valid');

    // -------------------------------------------------------------
    // Test 9: Partner Deletion Flow
    // -------------------------------------------------------------
    console.log('\n--- Test Group 9: Partner Deletion ---');
    await db.deletePartner(inactivePartnerId);
    const afterDelete = await db.getPartnerById(inactivePartnerId);
    assert(afterDelete === null, 'Deleted partner no longer exists in database');

    console.log('\n=====================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
