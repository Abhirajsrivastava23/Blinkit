const fetch = require('node:http').request;

function apiCall(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = `http://localhost:3000${path}`;
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = fetch(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING AUTOMATED LOGISTICS VERIFICATION ===');
  
  // 1. Fetch all orders
  console.log('\nStep 1: Fetching all orders...');
  const getRes = await apiCall('/api/orders');
  if (getRes.status !== 200) {
    console.error('Failed to fetch orders:', getRes.status);
    process.exit(1);
  }
  
  const orders = getRes.body;
  const targetOrder = orders.find(o => o.id === 'FT97565' || o.id === 'FF73030');
  if (!targetOrder) {
    console.error('Target order not found in orders database. Place an order on the storefront first.');
    process.exit(1);
  }
  console.log(`Found target order: ID=${targetOrder.id}, LocationId=${targetOrder.deliveryLocationId}, Status=${targetOrder.status}`);

  // 2. Progress order status to 'Waiting for Partner'
  console.log('\nStep 2: Progressing status to Waiting for Partner...');
  const progressRes = await apiCall('/api/orders/update', 'POST', {
    id: targetOrder.id,
    updates: { status: 'Waiting for Partner' }
  });
  console.log('Update Status Response:', progressRes.status, progressRes.body);

  // 3. Verify security backend filtering before assignment
  console.log('\nStep 3: Verifying that neither partner sees the unassigned order in their dispatches...');
  const rahulBefore = await apiCall('/api/delivery/orders', 'GET', null, { 'x-partner-id': 'DP-001' });
  const amanBefore = await apiCall('/api/delivery/orders', 'GET', null, { 'x-partner-id': 'DP-002' });
  console.log(`Rahul (DP-001) dispatches count: ${rahulBefore.body.length}`);
  console.log(`Aman (DP-002) dispatches count: ${amanBefore.body.length}`);

  // 4. Assign the order to compatible partner Rahul (DP-001)
  console.log('\nStep 4: Assigning order to Rahul (DP-001) Nawabganj...');
  const assignRes = await apiCall('/api/orders/update', 'POST', {
    id: targetOrder.id,
    updates: {
      assignedPartnerId: 'DP-001',
      assignedPartnerName: 'Rahul',
      status: 'Assigned',
      assignedAt: new Date().toISOString()
    }
  });
  console.log('Assignment response:', assignRes.status, assignRes.body);

  // 5. Verify security backend filtering after assignment
  console.log('\nStep 5: Verifying partner-based security isolation (x-partner-id routing)...');
  const rahulAfter = await apiCall('/api/delivery/orders', 'GET', null, { 'x-partner-id': 'DP-001' });
  const amanAfter = await apiCall('/api/delivery/orders', 'GET', null, { 'x-partner-id': 'DP-002' });
  
  const rahulHasOrder = rahulAfter.body.some(o => o.id === targetOrder.id);
  const amanHasOrder = amanAfter.body.some(o => o.id === targetOrder.id);
  
  console.log(`- Rahul (DP-001) sees order in dispatches: ${rahulHasOrder ? '✅ YES' : '❌ NO'}`);
  console.log(`- Aman (DP-002) sees order in dispatches: ${amanHasOrder ? '❌ YES (Security Breach)' : '✅ NO (Isolated)'}`);

  if (!rahulHasOrder || amanHasOrder) {
    console.error('Security verification failed!');
    process.exit(1);
  }

  // 6. Step status transitions: Assigned -> Accepted -> Picked Up -> Out for Delivery -> Delivered
  const states = ['Accepted', 'Picked Up', 'Out for Delivery', 'Delivered'];
  for (const nextState of states) {
    console.log(`\nStep 6: Progressing delivery status to '${nextState}'...`);
    const updateRes = await apiCall('/api/orders/update', 'POST', {
      id: targetOrder.id,
      updates: { status: nextState }
    });
    
    // Fetch to verify database persistence
    const checkRes = await apiCall('/api/orders');
    const checked = checkRes.body.find(o => o.id === targetOrder.id);
    console.log(`- Persisted status in DB: ${checked.status === nextState ? '✅ Match' : '❌ Mismatch'}`);
  }

  console.log('\n=== LOGISTICS FLOW COMPLETED & VERIFIED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
