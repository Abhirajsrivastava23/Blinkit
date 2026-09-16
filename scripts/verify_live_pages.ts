import https from 'https';

const pagesToCheck = [
  '/',
  '/cakes',
  '/pastries',
  '/delivery',
  '/shipping-policy',
  '/refund-policy',
  '/about',
  '/contact',
  '/faq',
  '/checkout',
  '/product/choco-chip-truffle-cake'
];

const forbiddenTerms = [
  'within 12 hours',
  '12 hours',
  'dispatch within minutes',
  'concierge@fatafat.com',
  'support@fatafatapp.me',
  'VM Logistics'
];

function fetchPage(path: string): Promise<{ path: string; status: number; body: string }> {
  return new Promise((resolve) => {
    const url = `https://www.fatafatapp.me${path}`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (FATAFAT Live Audit)' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ path, status: res.statusCode || 0, body }));
    }).on('error', (err) => {
      resolve({ path, status: 500, body: err.message });
    });
  });
}

async function auditLive() {
  console.log('================================================================');
  console.log('        LIVE PRODUCTION PAGES AUDIT (https://www.fatafatapp.me) ');
  console.log('================================================================\n');

  console.log('| Page | HTTP Status | Delivery Check | Support Email Check | Status |');
  console.log('| :--- | :---: | :--- | :--- | :---: |');

  for (const p of pagesToCheck) {
    const res = await fetchPage(p);
    const bodyLower = res.body.toLowerCase();

    const violations = forbiddenTerms.filter(t => bodyLower.includes(t.toLowerCase()));
    const has24h = bodyLower.includes('24 hours') || bodyLower.includes('24-hour');
    const hasEmail = bodyLower.includes('hello.fatafat@gmail.com');

    let pageStatus = 'PASS';
    if (res.status !== 200) {
      pageStatus = `HTTP ${res.status}`;
    } else if (violations.length > 0) {
      pageStatus = 'FAIL';
    }

    const delCheck = violations.filter(v => v.includes('hour') || v.includes('minute')).length > 0 
      ? `❌ Found: ${violations.join(', ')}` 
      : (has24h ? '✅ 24h standard found' : 'ℹ️ Neutral / No old claims');

    const emailCheck = violations.filter(v => v.includes('@')).length > 0
      ? `❌ Old email: ${violations.join(', ')}`
      : (hasEmail ? '✅ hello.fatafat@gmail.com' : 'ℹ️ Standard / Contact link');

    console.log(`| ${p} | ${res.status} | ${delCheck} | ${emailCheck} | **${pageStatus}** |`);
  }
}

auditLive();
