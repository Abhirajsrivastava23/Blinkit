const fs = require('fs');
const path = require('path');

// Simple regex parser for TS mockData file
const content = fs.readFileSync(path.join(__dirname, '../src/data/mockData.ts'), 'utf8');

// Match all product blocks
const productsMatch = content.match(/export const PRODUCTS: Product\[\] = \[\s*([\s\S]*?)\s*\];/);
if (!productsMatch) {
  console.log("Could not find PRODUCTS array");
  process.exit(1);
}

const productsBlock = productsMatch[1];
// Split by individual object boundaries: { ... }
const items = [];
const itemRegex = /\{([\s\S]*?)\}/g;
let match;
while ((match = itemRegex.exec(productsBlock)) !== null) {
  const itemStr = match[1];
  const idMatch = itemStr.match(/id:\s*'([^']+)'/);
  const nameMatch = itemStr.match(/name:\s*'([^']+)'/);
  const catMatch = itemStr.match(/category:\s*'([^']+)'/);
  const imageMatch = itemStr.match(/image:\s*'([^']+)'/);
  
  if (idMatch && nameMatch && catMatch && imageMatch) {
    items.push({
      id: idMatch[1],
      name: nameMatch[1],
      category: catMatch[1],
      image: imageMatch[1]
    });
  }
}

console.log(`Found ${items.length} products:`);
const seenImages = new Map();
items.forEach(item => {
  console.log(`- [${item.category.toUpperCase()}] ID: ${item.id} | Name: "${item.name}"`);
  console.log(`  Image: ${item.image}`);
  if (seenImages.has(item.image)) {
    seenImages.get(item.image).push(item.id);
  } else {
    seenImages.set(item.image, [item.id]);
  }
});

console.log("\n--- DUPLICATED IMAGES CHECK ---");
let dupesCount = 0;
for (const [url, ids] of seenImages.entries()) {
  if (ids.length > 1) {
    dupesCount++;
    console.log(`Duplicate Image: ${url}`);
    console.log(`Used by IDs: ${ids.join(', ')}`);
  }
}
console.log(`Total duplicated images: ${dupesCount}`);
