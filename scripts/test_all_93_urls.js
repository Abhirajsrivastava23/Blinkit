const fs = require('fs');
const path = require('path');

async function testUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    const ct = res.headers.get('content-type') || '';
    return { url, status: res.status, ok: res.ok && ct.startsWith('image/'), contentType: ct };
  } catch (err) {
    return { url, status: 0, ok: false, error: err.message };
  }
}

async function run() {
  const urls = JSON.parse(fs.readFileSync(path.join(__dirname, 'all_image_urls.json'), 'utf8'));
  console.log(`Auditing all ${urls.length} URLs...`);

  const results = [];
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i];
    const r = await testUrl(u);
    results.push(r);
    if (!r.ok) {
      console.log(`❌ [${r.status}] ${r.contentType || r.error} -> ${u}`);
    }
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\nAudit complete: ${results.length - failed.length} passed, ${failed.length} failed.`);
  fs.writeFileSync(path.join(__dirname, 'failed_image_urls.json'), JSON.stringify(failed, null, 2));
}

run();
