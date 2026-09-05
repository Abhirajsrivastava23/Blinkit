const fs = require('fs');
const path = require('path');

async function checkImage(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    const contentType = res.headers.get('content-type') || '';
    const isImage = contentType.startsWith('image/');
    const contentLength = res.headers.get('content-length') || 0;
    return {
      url,
      status: res.status,
      ok: res.ok && isImage,
      contentType,
      size: contentLength
    };
  } catch (err) {
    return {
      url,
      status: 0,
      ok: false,
      error: err.message
    };
  }
}

async function testAll() {
  const mockData = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'mockData.ts'), 'utf8');
  const productsJson = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'products.json'), 'utf8');
  const imageUtils = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'imageUtils.ts'), 'utf8');
  const homePage = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'page.tsx'), 'utf8');

  const urlRegex = /https?:\/\/[^\s"',`)]+/g;
  const urls = new Set([
    ...(mockData.match(urlRegex) || []),
    ...(productsJson.match(urlRegex) || []),
    ...(imageUtils.match(urlRegex) || []),
    ...(homePage.match(urlRegex) || [])
  ]);

  console.log(`Checking ${urls.size} distinct image URLs...`);
  const results = [];
  for (const url of urls) {
    const r = await checkImage(url);
    results.push(r);
    if (!r.ok) {
      console.log(`❌ FAILED [${r.status}] (${r.contentType || r.error}): ${url}`);
    } else {
      console.log(`✅ OK [${r.status}] (${r.contentType}): ${url.slice(0, 70)}...`);
    }
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\nSummary: ${results.length - failed.length} passed, ${failed.length} failed.`);
}

testAll();
