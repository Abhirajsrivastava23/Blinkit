import https from 'https';

interface PageReport {
  url: string;
  httpStatus: number;
  vercelId?: string;
  has24Hours: boolean;
  has12Hours: boolean;
  hasMinutesPromise: boolean;
  hasHelloEmail: boolean;
  hasConciergeEmail: boolean;
  hasSupportFatafatEmail: boolean;
  hasVmLogistics: boolean;
  rawViolations: string[];
  findings: string;
  status: 'LIVE_UPDATED' | 'STALE_OLD_BUILD' | 'ERROR';
}

const targetUrls = [
  'https://www.fatafatapp.me/',
  'https://www.fatafatapp.me/delivery',
  'https://www.fatafatapp.me/shipping-policy',
  'https://www.fatafatapp.me/refund-policy',
  'https://www.fatafatapp.me/about',
  'https://www.fatafatapp.me/contact',
  'https://www.fatafatapp.me/faq',
  'https://www.fatafatapp.me/help',
  'https://www.fatafatapp.me/product/choco-chip-truffle-cake',
  'https://www.fatafatapp.me/checkout',
  'https://www.fatafatapp.me/order-success'
];

function fetchLive(url: string): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FATAFAT-Audit/1.0', 'Cache-Control': 'no-cache' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body }));
    }).on('error', (err) => {
      resolve({ status: 500, headers: {}, body: err.message });
    });
  });
}

async function runDetailedAudit() {
  console.log('================================================================================');
  console.log('            DETAILED LIVE HTTP & PRODUCTION AUDIT REPORT                        ');
  console.log('================================================================================\n');

  const reports: PageReport[] = [];

  for (const url of targetUrls) {
    const res = await fetchLive(url);
    const body = res.body;
    const bodyLower = body.toLowerCase();

    const has12Hours = /within\s+12\s+hours|12\s+hours/i.test(body);
    const has24Hours = /within\s+24\s+hours|delivery\s+within\s+24\s+hours/i.test(body);
    const hasMinutesPromise = /dispatch\s+within\s+minutes|delivered\s+in\s+minutes/i.test(body);
    const hasHelloEmail = bodyLower.includes('hello.fatafat@gmail.com');
    const hasConciergeEmail = bodyLower.includes('concierge@fatafat.com');
    const hasSupportFatafatEmail = bodyLower.includes('support@fatafatapp.me');
    const hasVmLogistics = /vm\s+logistics/i.test(body);

    const violations: string[] = [];
    if (has12Hours) violations.push('Within 12 hours');
    if (hasMinutesPromise) violations.push('minutes promise');
    if (hasConciergeEmail) violations.push('concierge@fatafat.com');
    if (hasSupportFatafatEmail) violations.push('support@fatafatapp.me');
    if (hasVmLogistics) violations.push('VM Logistics');

    let status: 'LIVE_UPDATED' | 'STALE_OLD_BUILD' | 'ERROR' = 'LIVE_UPDATED';
    if (res.status !== 200 && res.status !== 308) {
      status = 'ERROR';
    } else if (violations.length > 0) {
      status = 'STALE_OLD_BUILD';
    }

    const vercelId = (res.headers['x-vercel-id'] || res.headers['x-matched-path'] || '') as string;

    reports.push({
      url,
      httpStatus: res.status,
      vercelId,
      has24Hours,
      has12Hours,
      hasMinutesPromise,
      hasHelloEmail,
      hasConciergeEmail,
      hasSupportFatafatEmail,
      hasVmLogistics,
      rawViolations: violations,
      findings: violations.length === 0 ? 'Compliant / No legacy tokens' : `Violations: ${violations.join(', ')}`,
      status
    });
  }

  console.log('| URL | HTTP | Vercel Live Status | 24h Present | 12h Absent | Support Email | Legacy Absent |');
  console.log('| :--- | :---: | :---: | :---: | :---: | :--- | :---: |');

  for (const r of reports) {
    const del24 = r.has24Hours ? '✅ YES' : '➖ (N/A)';
    const del12 = !r.has12Hours ? '✅ ABSENT' : '❌ PRESENT';
    const emailStatus = r.hasHelloEmail ? '✅ hello.fatafat@gmail.com' : (r.hasConciergeEmail ? '❌ concierge@fatafat.com' : 'ℹ️ Standard Link');
    const legacyAbsent = r.rawViolations.length === 0 ? '✅ ABSENT' : `❌ ${r.rawViolations.join(', ')}`;
    const liveTag = r.status === 'LIVE_UPDATED' ? '**LIVE PASS**' : (r.status === 'STALE_OLD_BUILD' ? '**STALE BUILD**' : '**HTTP ERR**');

    console.log(`| ${r.url.replace('https://www.fatafatapp.me', '') || '/'} | ${r.httpStatus} | ${liveTag} | ${del24} | ${del12} | ${emailStatus} | ${legacyAbsent} |`);
  }

  console.log('\n--------------------------------------------------------------------------------');
  const staleCount = reports.filter(r => r.status === 'STALE_OLD_BUILD').length;
  const passCount = reports.filter(r => r.status === 'LIVE_UPDATED').length;
  console.log(`Summary: ${passCount} URLs LIVE PASS, ${staleCount} URLs STALE (Awaiting deployment sync to live edge)`);
}

runDetailedAudit();
