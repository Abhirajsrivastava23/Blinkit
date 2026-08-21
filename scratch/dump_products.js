const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/mockData.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Find the start of PRODUCTS
const startToken = 'export const PRODUCTS: Product[] = [';
const startIdx = content.indexOf(startToken);
if (startIdx === -1) {
  console.error("Could not find PRODUCTS start token");
  process.exit(1);
}

// Find the end of PRODUCTS (just before MOCK_REVIEWS)
const endToken = 'export const MOCK_REVIEWS';
const endIdx = content.indexOf(endToken);
if (endIdx === -1) {
  console.error("Could not find MOCK_REVIEWS end token");
  process.exit(1);
}

// Extract the products array text
let arrayText = content.substring(startIdx + startToken.length - 1, endIdx).trim();
if (arrayText.endsWith(';')) {
  arrayText = arrayText.slice(0, -1).trim();
}

try {
  // Evaluate the array text using Function constructor
  const products = new Function(`return ${arrayText}`)();
  
  // Save as JSON
  const destPath = path.join(__dirname, '../src/data/products.json');
  fs.writeFileSync(destPath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`Successfully dumped ${products.length} products to products.json`);
} catch (err) {
  console.error("Error evaluating or writing products:", err);
  process.exit(1);
}
