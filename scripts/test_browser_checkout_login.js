const http = require('http');

async function test() {
  const BASE_URL = 'http://localhost:3000';
  
  // 1. Login as customer
  const loginData = JSON.stringify({ emailOrId: 'customer@fatafat.com', password: 'customer123' });
  const loginRes = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    });
    req.write(loginData);
    req.end();
  });

  console.log('Login Status:', loginRes.status);
  const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';

  // 2. Place Order
  const orderData = JSON.stringify({
    items: [{ id: 'cake-4', productId: 'cake-belgian-chocolate', name: 'Belgian Chocolate Cake', price: 649, quantity: 1 }],
    address: { name: 'Customer Test', mobile: '9876543210', house: '101', street: 'Civil Lines', area: 'Central', city: 'Unnao', pincode: '209859' },
    deliveryOption: 'ASAP',
    paymentMethod: 'Razorpay'
  });

  const orderRes = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/orders',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie, 'Content-Length': Buffer.byteLength(orderData) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.write(orderData);
    req.end();
  });

  console.log('Order Create Status:', orderRes.status);
  const orderId = orderRes.data?.order?.id || orderRes.data?.id;
  console.log('Created Order ID:', orderId);
  console.log('Direct Payment Page URL: http://localhost:3000/order/' + orderId + '/payment');
}

test();
