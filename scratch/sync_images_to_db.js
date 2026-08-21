const fs = require('fs');
const path = require('path');

// Curated unique high-resolution Unsplash images
const imageMap = {
  // Cakes (20)
  'cake-1': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
  'cake-2': 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?w=600&auto=format&fit=crop&q=80',
  'cake-3': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
  'cake-4': 'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&auto=format&fit=crop&q=80',
  'cake-5': 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&auto=format&fit=crop&q=80',
  'cake-6': 'https://images.unsplash.com/photo-1535141192574-5d4897c13636?w=600&auto=format&fit=crop&q=80',
  'cake-7': 'https://images.unsplash.com/photo-1542826438-bd32f43d626f?w=600&auto=format&fit=crop&q=80',
  'cake-8': 'https://images.unsplash.com/photo-1519869325930-281384150729?w=600&auto=format&fit=crop&q=80',
  'cake-9': 'https://images.unsplash.com/photo-1571115177098-24ec42095185?w=600&auto=format&fit=crop&q=80',
  'cake-10': 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=600&auto=format&fit=crop&q=80',
  'cake-11': 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&auto=format&fit=crop&q=80',
  'cake-12': 'https://images.unsplash.com/photo-1559620192-032c4bc4674e?w=600&auto=format&fit=crop&q=80',
  'cake-13': 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80',
  'cake-14': 'https://images.unsplash.com/photo-1508737027454-e6454ef45afd?w=600&auto=format&fit=crop&q=80',
  'cake-15': 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&auto=format&fit=crop&q=80',
  'cake-16': 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=600&auto=format&fit=crop&q=80',
  'cake-17': 'https://images.unsplash.com/photo-1562007908-17c67e872c88?w=600&auto=format&fit=crop&q=80',
  'cake-18': 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=600&auto=format&fit=crop&q=80',
  'cake-19': 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600&auto=format&fit=crop&q=80',
  'cake-20': 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?w=600&auto=format&fit=crop&q=80',

  // Bakery (10)
  'bakery-1': 'https://images.unsplash.com/photo-1586788224331-947f68671cf1?w=600&auto=format&fit=crop&q=80',
  'bakery-2': 'https://images.unsplash.com/photo-1624451860111-23c965e80718?w=600&auto=format&fit=crop&q=80',
  'bakery-3': 'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&auto=format&fit=crop&q=80',
  'bakery-4': 'https://images.unsplash.com/photo-1558961317-5f241202db89?w=600&auto=format&fit=crop&q=80',
  'bakery-5': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop&q=80',
  'bakery-6': 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop&q=80',
  'bakery-7': 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=600&auto=format&fit=crop&q=80',
  'bakery-8': 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600&auto=format&fit=crop&q=80',
  'bakery-9': 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80',
  'bakery-10': 'https://images.unsplash.com/photo-1614707267537-b85acf00c4b8?w=600&auto=format&fit=crop&q=80',

  // Chocolates (10)
  'choco-1': 'https://images.unsplash.com/photo-1548907040-4d42b52125b0?w=600&auto=format&fit=crop&q=80',
  'choco-2': 'https://images.unsplash.com/photo-1526081347589-7fa3cb41b057?w=600&auto=format&fit=crop&q=80',
  'choco-3': 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&auto=format&fit=crop&q=80',
  'choco-4': 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=600&auto=format&fit=crop&q=80',
  'choco-5': 'https://images.unsplash.com/photo-1544967082-d9d25dca7cbd?w=600&auto=format&fit=crop&q=80',
  'choco-6': 'https://images.unsplash.com/photo-1604152135912-04a022e23696?w=600&auto=format&fit=crop&q=80',
  'choco-7': 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&auto=format&fit=crop&q=80',
  'choco-8': 'https://images.unsplash.com/photo-1549007994-cb92cfd7d4d8?w=600&auto=format&fit=crop&q=80',
  'choco-9': 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=600&auto=format&fit=crop&q=80',
  'choco-10': 'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=600&auto=format&fit=crop&q=80',

  // Flowers (10)
  'flower-1': 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600&auto=format&fit=crop&q=80',
  'flower-2': 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=600&auto=format&fit=crop&q=80',
  'flower-3': 'https://images.unsplash.com/photo-1508784932226-2293774888be?w=600&auto=format&fit=crop&q=80',
  'flower-4': 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=600&auto=format&fit=crop&q=80',
  'flower-5': 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&auto=format&fit=crop&q=80',
  'flower-6': 'https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?w=600&auto=format&fit=crop&q=80',
  'flower-7': 'https://images.unsplash.com/photo-1520763185298-1b434c919102?w=600&auto=format&fit=crop&q=80',
  'flower-8': 'https://images.unsplash.com/photo-1533616688419-b7a585564566?w=600&auto=format&fit=crop&q=80',
  'flower-9': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&auto=format&fit=crop&q=80',
  'flower-10': 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop&q=80',

  // Gifts (10)
  'gift-1': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80',
  'gift-2': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80',
  'gift-3': 'https://images.unsplash.com/photo-1559251606-c623743a6d76?w=600&auto=format&fit=crop&q=80',
  'gift-4': 'https://images.unsplash.com/photo-1572297825313-094fc1424e6a?w=600&auto=format&fit=crop&q=80',
  'gift-5': 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=600&auto=format&fit=crop&q=80',
  'gift-6': 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop&q=80',
  'gift-7': 'https://images.unsplash.com/photo-1627124357773-41319db23f2f?w=600&auto=format&fit=crop&q=80',
  'gift-8': 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80',
  'gift-9': 'https://images.unsplash.com/photo-1545241047-6083a3684587?w=600&auto=format&fit=crop&q=80',
  'gift-10': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80',

  // Celebrations (10)
  'celeb-1': 'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=600&auto=format&fit=crop&q=80',
  'celeb-2': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
  'celeb-3': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  'celeb-4': 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&auto=format&fit=crop&q=80',
  'celeb-5': 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
  'celeb-6': 'https://images.unsplash.com/photo-1496843916299-fc090c115ed1?w=600&auto=format&fit=crop&q=80',
  'celeb-7': 'https://images.unsplash.com/photo-1533294160022-417ee9fd8b76?w=600&auto=format&fit=crop&q=80',
  'celeb-8': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80',
  'celeb-9': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=80',
  'celeb-10': 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=600&auto=format&fit=crop&q=80',

  // Wellness (10)
  'well-1': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
  'well-2': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
  'well-3': 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&auto=format&fit=crop&q=80',
  'well-4': 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80',
  'well-5': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
  'well-6': 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&auto=format&fit=crop&q=80',
  'well-7': 'https://images.unsplash.com/photo-1601049676099-e7ed07d825b0?w=600&auto=format&fit=crop&q=80',
  'well-8': 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=600&auto=format&fit=crop&q=80',
  'well-9': 'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&auto=format&fit=crop&q=80',
  'well-10': 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=600&auto=format&fit=crop&q=80'
};

const dbPath = path.join(__dirname, '../src/data/db/products.json');

if (fs.existsSync(dbPath)) {
  const products = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  let updatedCount = 0;

  for (let p of products) {
    if (imageMap[p.id]) {
      p.image = imageMap[p.id];
      updatedCount++;
    }
  }

  fs.writeFileSync(dbPath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`Successfully synchronized ${updatedCount} product images in products.json database.`);
} else {
  console.log('Database products.json does not exist yet.');
}
