const fs = require('fs');
const path = require('path');

async function testUrl(url) {
  if (!url || typeof url !== 'string') return { status: 'INVALID_TYPE', url };
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) {
    return { status: 'LOCAL_OR_DATA', url };
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { 
      method: 'HEAD', 
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    clearTimeout(timeout);
    return { status: res.status, ok: res.ok, url };
  } catch (err) {
    return { status: 'ERR: ' + err.message, ok: false, url };
  }
}

async function run() {
  const mockDataFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'mockData.ts'), 'utf8');
  const productsJsonFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'products.json'), 'utf8');

  // Extract all urls matching https://images.unsplash.com/... or any http(s) url
  const urlRegex = /https?:\/\/[^\s"',`]+/g;
  const mockUrls = new Set(mockDataFile.match(urlRegex) || []);
  const jsonUrls = new Set(productsJsonFile.match(urlRegex) || []);

  const allUrls = Array.from(new Set([...mockUrls, ...jsonUrls]));
  console.log(`Found ${allUrls.length} unique external URLs to audit.`);

  const results = [];
  const batchSize = 10;
  for (let i = 0; i < allUrls.length; i += batchSize) {
    const batch = allUrls.slice(i, i + batchSize);
    const batchRes = await Promise.all(batch.map(testUrl));
    results.push(...batchRes);
    process.stdout.write(`Tested ${Math.min(i + batchSize, allUrls.length)} / ${allUrls.length}\r`);
  }
  console.log('\nAudit complete.');

  const broken = results.filter(r => !r.ok);
  console.log(`\nBroken URLs: ${broken.length} / ${results.length}`);
  for (const b of broken) {
    console.log(`[${b.status}] ${b.url}`);
  }
}

run();
