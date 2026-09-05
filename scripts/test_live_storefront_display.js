const http = require('http');

async function fetchPage(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Testing Storefront Pages on Dev Server: http://localhost:3000\n');

  const pagesToTest = [
    { path: '/', name: 'Homepage', sampleKeywords: ['Tropical Fruit N Almond Cake', 'Rich Chocolate Truffle Cake', 'Assorted Pastry Box'] },
    { path: '/birthday-cakes', name: 'Birthday Cakes Page', sampleKeywords: ['Tropical Fruit N Almond Cake', 'Butterscotch Crunch Cake', 'Birthday Photo Cake'] },
    { path: '/chocolate-cakes', name: 'Chocolate Cakes Page', sampleKeywords: ['Rich Chocolate Truffle Cake', 'Belgian Chocolate Cake', 'Choco Dream Cake'] },
    { path: '/pastries', name: 'Pastries Page', sampleKeywords: ['Happy Birthday Chocolate Pastries', 'Classic Chocolate Truffle Pastry', 'Assorted Pastry Box'] },
    { path: '/beer-theme-cakes', name: 'Beer Theme Cakes Page', sampleKeywords: ['Fondant Theme Beer Mug Cake', 'No More Single Beer Bachelor Cake', 'Cheers Beer Mug Cake'] },
    { path: '/desserts', name: 'Desserts Page', sampleKeywords: ['Blueberry Cheesecake', 'Red Velvet Jar Cake', 'Kunafa Chocolate Tub'] },
    { path: '/cakes', name: 'All Cakes Page', sampleKeywords: ['Tropical Fruit N Almond Cake', 'Rich Chocolate Truffle Cake', 'Fondant Theme Beer Mug Cake'] }
  ];

  let passed = 0;

  for (const page of pagesToTest) {
    try {
      const res = await fetchPage(page.path);
      if (res.status === 200) {
        console.log(`✔ [HTTP 200] ${page.name} (${page.path})`);
        // Check keywords
        const found = page.sampleKeywords.filter(kw => res.body.includes(kw));
        console.log(`   Found keywords in HTML (${found.length}/${page.sampleKeywords.length}): ${found.join(', ')}`);
        passed++;
      } else {
        console.error(`❌ [HTTP ${res.status}] ${page.name} (${page.path})`);
      }
    } catch (err) {
      console.error(`❌ [ERROR] ${page.name} (${page.path}): ${err.message}`);
    }
  }

  console.log(`\nResult: ${passed}/${pagesToTest.length} pages verified successfully.`);
}

main();
