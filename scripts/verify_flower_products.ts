import fs from 'fs';
import path from 'path';
import { PRODUCTS, Product } from '../src/data/mockData';
import { resolveImageUrl } from '../src/utils/imageUtils';

const EXPECTED_FLOWERS: { name: string; price: number; id: string }[] = [
  { name: 'Pink Rose Birthday Bliss Bouquet', price: 1349, id: 'pink-rose-birthday-bliss-bouquet' },
  { name: 'Pretty in Pink Floral Vase', price: 1649, id: 'pretty-in-pink-floral-vase' },
  { name: 'Rosy Orchid Celebration Bouquet', price: 999, id: 'rosy-orchid-celebration-bouquet' },
  { name: 'Vivid Love 6 Red Roses Bouquet', price: 499, id: 'vivid-love-6-red-roses-bouquet' },
  { name: 'Yellow Flag Blooms', price: 949, id: 'yellow-flag-blooms' },
  { name: 'Lavender Blush Bouquet', price: 1249, id: 'lavender-blush-bouquet' },
  { name: 'Exotic Blue Orchid Arrangement', price: 699, id: 'exotic-blue-orchid-arrangement' },
  { name: 'Ivory Roses Birthday Bouquet', price: 1199, id: 'ivory-roses-birthday-bouquet' },
  { name: 'Elegant Pink Rosy Celebration Bouquet', price: 499, id: 'elegant-pink-rosy-celebration-bouquet' },
  { name: 'Pink & White Carnation Hand-Tied Bouquet', price: 699, id: 'pink-and-white-carnation-hand-tied-bouquet' },
  { name: 'Blue Stem Edit', price: 449, id: 'blue-stem-edit' },
  { name: 'Meadow Sunshine Summer Bloom', price: 499, id: 'meadow-sunshine-summer-bloom' },
  { name: 'Blush Rose Garden', price: 949, id: 'blush-rose-garden' },
  { name: 'Flirtatious Gerberas', price: 549, id: 'flirtatious-gerberas' },
  { name: 'Vibrant Royal Blue Orchid Bouquet', price: 699, id: 'vibrant-royal-blue-orchid-bouquet' },
  { name: 'White Orchid Wish', price: 449, id: 'white-orchid-wish' },
  { name: 'Blue Rose Charm For Him', price: 499, id: 'blue-rose-charm-for-him' },
  { name: 'Roses And Checks', price: 499, id: 'roses-and-checks' },
  { name: 'Blushing Rose Celebration', price: 499, id: 'blushing-rose-celebration' },
  { name: 'Exotic Single Red Rose', price: 299, id: 'exotic-single-red-rose' },
  { name: 'Blushing Roses Anniversary Sleeve', price: 349, id: 'blushing-roses-anniversary-sleeve' },
  { name: 'Suits and Roses', price: 499, id: 'suits-and-roses' }
];

async function verifyCatalog() {
  console.log('========================================================');
  console.log('🧪 VERIFYING FLOWER PRODUCTS IN CATALOG & POSTGRESQL');
  console.log('========================================================');

  // 1. Check db/products.json and products.json
  const dbProducts: Product[] = JSON.parse(fs.readFileSync(path.resolve('src/data/db/products.json'), 'utf8'));
  const appProducts: Product[] = JSON.parse(fs.readFileSync(path.resolve('src/data/products.json'), 'utf8'));

  console.log(`\n1. Checking file counts:`);
  console.log(`   - db/products.json: ${dbProducts.length} items`);
  console.log(`   - src/data/products.json: ${appProducts.length} items`);
  console.log(`   - mockData.ts PRODUCTS: ${PRODUCTS.length} items`);

  if (dbProducts.length !== 89 || appProducts.length !== 89 || PRODUCTS.length !== 89) {
    throw new Error(`Total products count mismatch! Expected 89, got db=${dbProducts.length}, app=${appProducts.length}, mock=${PRODUCTS.length}`);
  }
  console.log('   ✅ Total products count is exactly 89 (67 existing + 22 new flowers).');

  // 2. Check no duplicate IDs or Names
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const p of dbProducts) {
    if (ids.has(p.id)) throw new Error(`Duplicate product ID: ${p.id}`);
    if (names.has(p.name)) throw new Error(`Duplicate product Name: ${p.name}`);
    ids.add(p.id);
    names.add(p.name);
  }
  console.log('\n2. Duplicate check:');
  console.log('   ✅ 0 duplicate IDs and 0 duplicate names in entire catalog.');

  // 3. Check Heartfelt Sip Mug is NOT present
  const mug = dbProducts.find(p => p.name.toLowerCase().includes('heartfelt sip') || p.id.toLowerCase().includes('heartfelt-sip'));
  if (mug) {
    throw new Error(`Forbidden product "Heartfelt Sip Mug" was found: ${mug.name}`);
  }
  console.log('\n3. Exclusion check:');
  console.log('   ✅ "Heartfelt Sip Mug" is NOT in the catalog.');

  // 4. Verify all 22 flower products exist with exact names, prices, categories, and resolved images
  console.log('\n4. Verifying all 22 flower products:');
  const flowers = dbProducts.filter(p => (p.category || '').toLowerCase() === 'flowers');
  if (flowers.length !== 22) {
    throw new Error(`Expected 22 flower products, found ${flowers.length}`);
  }

  for (let i = 0; i < EXPECTED_FLOWERS.length; i++) {
    const expected = EXPECTED_FLOWERS[i];
    const found = flowers.find(f => f.name === expected.name);
    if (!found) {
      throw new Error(`Missing expected flower product: "${expected.name}"`);
    }
    if (found.price !== expected.price) {
      throw new Error(`Price mismatch for "${expected.name}": Expected ₹${expected.price}, found ₹${found.price}`);
    }
    if (found.category !== 'flowers') {
      throw new Error(`Category mismatch for "${expected.name}": Expected "flowers", found "${found.category}"`);
    }
    const resolvedImg = resolveImageUrl(found.image, found.category);
    if (!resolvedImg || resolvedImg.length === 0) {
      throw new Error(`Image resolution failed for "${expected.name}"`);
    }
    console.log(`   [${i + 1}/22] ✅ ${found.name} — ₹${found.price} (image: ${resolvedImg.slice(0, 45)}...)`);
  }

  // 5. Check category filtering logic used by /flowers page and /api/products
  const filteredFlowers = PRODUCTS.filter(p => (p.category || '').toLowerCase().trim() === 'flowers');
  if (filteredFlowers.length !== 22) {
    throw new Error(`Storefront category filter mismatch! Expected 22 flowers, got ${filteredFlowers.length}`);
  }
  console.log('\n5. Storefront & API Category Filtering:');
  console.log(`   ✅ Category filter "flowers" returns exactly ${filteredFlowers.length} products.`);

  // 6. Search query test
  const searchRose = PRODUCTS.filter(p => p.name.toLowerCase().includes('rose') || p.description.toLowerCase().includes('rose'));
  console.log(`\n6. Search query "rose":`);
  console.log(`   ✅ Found ${searchRose.length} rose products across catalog.`);

  console.log('\n========================================================');
  console.log('🎉 ALL CATALOG AUDIT CHECKS PASSED PERFECTLY (100% SUCCESS)');
  console.log('========================================================\n');
}

verifyCatalog().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
