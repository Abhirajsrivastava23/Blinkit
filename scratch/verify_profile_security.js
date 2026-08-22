const crypto = require('crypto');

console.log('=== STARTING SECURITY PROFILE VALIDATION SUITE ===');

const BASE_URL = 'http://localhost:3000';

async function apiCall(endpoint, method = 'GET', body = null, headers = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  let responseBody = null;
  try {
    responseBody = await res.json();
  } catch (e) {
    // text response
  }
  return { status: res.status, body: responseBody, headers: res.headers };
}

function parseCookie(res) {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return '';
  return setCookie.split(';')[0];
}

async function run() {
  // 1. Authenticate Customer A (u-7978 / krishnamdwivedi17@gmail.com)
  console.log('\nLogging in Customer A...');
  const loginARes = await apiCall('/api/auth/customer-login', 'POST', {
    email: 'krishnamdwivedi17@gmail.com',
    phone: '9876541234',
    name: 'Customer A'
  });
  const cookieA = parseCookie(loginARes);
  console.log('Customer A authenticated. Cookie:', cookieA);

  // Assert Customer A profile loads
  const usersListRes1 = await apiCall('/api/users/list');
  const userA_before = usersListRes1.body.find(u => u.email === 'krishnamdwivedi17@gmail.com');
  console.log('Customer A before update:', { name: userA_before.name, phone: userA_before.phone, dob: userA_before.dob, gender: userA_before.gender });

  // Test 1: Customer updating own name, phone, dob, gender -> allowed
  console.log('\nTest 1: Updating Customer A own details (name, phone, dob, gender)...');
  const updateRes1 = await apiCall('/api/profile', 'POST', {
    name: 'Customer A Updated Name',
    phone: '9988998899',
    dob: '1995-10-15',
    gender: 'Male'
  }, { 'Cookie': cookieA });

  console.log('Profile update response status:', updateRes1.status, updateRes1.body);
  if (updateRes1.status !== 200) {
    console.error('FAILED: Could not update profile!');
    process.exit(1);
  }

  // Test 2: Customer updating own address list -> allowed
  console.log('\nTest 2: Updating Customer A addresses list...');
  const testAddresses = [
    { id: 'addr-test-1', name: 'Office A', mobile: '9988998899', house: '12', street: 'Tech St', area: 'IT Sector', city: 'Noida', pincode: '201301' }
  ];
  const updateResAddress = await apiCall('/api/profile', 'POST', {
    addresses: testAddresses
  }, { 'Cookie': cookieA });
  console.log('Address update response status:', updateResAddress.status);
  if (updateResAddress.status !== 200) {
    console.error('FAILED: Could not update address list!');
    process.exit(1);
  }

  // Test 3: Customer attempting to change own email -> blocked (403)
  console.log('\nTest 3: Customer A attempting to change own email...');
  const updateResEmail = await apiCall('/api/profile', 'POST', {
    email: 'newemail@fatafat.com'
  }, { 'Cookie': cookieA });
  console.log('Email update response status (expected 403):', updateResEmail.status, updateResEmail.body);
  if (updateResEmail.status !== 403) {
    console.error('FAILED: Customer allowed to change email address!');
    process.exit(1);
  }

  // Test 4: Customer attempting to change role / escalate privileges -> blocked (403)
  console.log('\nTest 4: Customer A attempting to escalate role to admin...');
  const updateResRole = await apiCall('/api/profile', 'POST', {
    role: 'admin'
  }, { 'Cookie': cookieA });
  console.log('Role escalation response status (expected 403):', updateResRole.status, updateResRole.body);
  if (updateResRole.status !== 403) {
    console.error('FAILED: Customer allowed to change role!');
    process.exit(1);
  }

  // Test 5: Customer attempting to change another customer's profile -> blocked (403)
  console.log("\nTest 5: Customer A attempting to change another customer's userId...");
  const updateResUserId = await apiCall('/api/profile', 'POST', {
    userId: 'u-4558' // Customer B's userId
  }, { 'Cookie': cookieA });
  console.log('Cross-user update response status (expected 403):', updateResUserId.status, updateResUserId.body);
  if (updateResUserId.status !== 403) {
    console.error("FAILED: Customer allowed to modify another customer's profile payload details!");
    process.exit(1);
  }

  // Test 6: Non-Admin attempting to call admin update-email endpoint -> blocked (403)
  console.log('\nTest 6: Customer A attempting to call admin update-email API...');
  const updateEmailUnauth = await apiCall('/api/admin/users/update-email', 'POST', {
    userId: 'u-7978',
    newEmail: 'hacker@fatafat.com'
  }, { 'Cookie': cookieA });
  console.log('Admin endpoint unauthorized status (expected 403):', updateEmailUnauth.status, updateEmailUnauth.body);
  if (updateEmailUnauth.status !== 403) {
    console.error('FAILED: Non-Admin was authorized to update email!');
    process.exit(1);
  }

  // 2. Authenticate Admin (superadmin@fatafat.com)
  console.log('\nLogging in Super Admin...');
  const adminLogin = await apiCall('/api/auth/login', 'POST', {
    emailOrId: 'superadmin@fatafat.com',
    password: 'admin123'
  });
  const adminCookie = parseCookie(adminLogin);
  console.log('Admin authenticated. Cookie:', adminCookie);

  // Test 7: Admin updating customer email -> allowed
  console.log('\nTest 7: Admin changing Customer A email...');
  const changeEmailRes = await apiCall('/api/admin/users/update-email', 'POST', {
    userId: 'u-7978',
    newEmail: 'krishnam.new@gmail.com'
  }, { 'Cookie': adminCookie });
  console.log('Admin change email status (expected 200):', changeEmailRes.status, changeEmailRes.body);
  if (changeEmailRes.status !== 200) {
    console.error('FAILED: Admin was unable to change customer email!');
    process.exit(1);
  }

  // Test 8: Admin updating to duplicate email -> blocked (400)
  console.log('\nTest 8: Admin attempting to change Customer A email to an already used email (aman@gmail.com)...');
  const changeEmailDupRes = await apiCall('/api/admin/users/update-email', 'POST', {
    userId: 'u-7978',
    newEmail: 'aman@gmail.com'
  }, { 'Cookie': adminCookie });
  console.log('Admin duplicate email change status (expected 400):', changeEmailDupRes.status, changeEmailDupRes.body);
  if (changeEmailDupRes.status !== 400) {
    console.error('FAILED: Admin allowed to update to a duplicate email!');
    process.exit(1);
  }

  // Clean up and restore Customer A email to original
  console.log('\nRestoring Customer A email to original address...');
  await apiCall('/api/admin/users/update-email', 'POST', {
    userId: 'u-7978',
    newEmail: 'krishnamdwivedi17@gmail.com'
  }, { 'Cookie': adminCookie });

  console.log('\n=== ALL SECURITY PROFILE VERIFICATIONS PASSED SUCCESSFULLY ===');
}

run();
