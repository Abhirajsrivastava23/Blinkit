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

async function testCookie() {
  console.log('Logging in to get cookie...');
  const loginRes = await apiCall('/api/auth/login', 'POST', {
    emailOrId: 'superadmin@fatafat.com',
    password: 'admin123'
  });

  const setCookie = loginRes.headers['set-cookie'];
  console.log('Set-Cookie Header:', setCookie);

  if (!setCookie) {
    console.error('No cookie set!');
    process.exit(1);
  }

  // Parse the cookie string
  const cookieStr = setCookie[0].split(';')[0];
  console.log('Extracted Cookie:', cookieStr);

  console.log('\nRequesting /api/auth/me using Cookie header...');
  const meRes = await apiCall('/api/auth/me', 'GET', null, {
    'Cookie': cookieStr
  });

  console.log('Response Status:', meRes.status);
  console.log('Response Body:', meRes.body);

  if (meRes.status === 200 && meRes.body.authenticated) {
    console.log('Success: Cookie auth works!');
  } else {
    console.error('Failure: Cookie auth failed!');
  }
}

testCookie();
