const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnv(file) {
  try {
    const full = path.resolve(file);
    if (!fs.existsSync(full)) return;
    const content = fs.readFileSync(full, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.slice(0, idx).trim();
        let v = trimmed.slice(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        process.env[k] = v;
      }
    }
  } catch (e) {}
}

loadEnv('.env.local');
loadEnv('.env');

const rawProductList = [
  { name: 'Rich Chocolate Truffle Cake', price: 549 },
  { name: 'Tropical Fruit N Almond Cake', price: 649 },
  { name: 'Butterscotch Crunch Cake', price: 529 },
  { name: 'Whipped Cream Pineapple Cake', price: 549 },
  { name: 'Choco Chip Truffle Cake', price: 549 },
  { name: 'Rose Petals N Pistachio Rasmalai Cake', price: 699 },
  { name: 'Chocolate Vanilla Half & Half Cake', price: 549 },
  { name: 'Roll Up Chocolate Truffle Cake', price: 549 },
  { name: 'Blueberry Cheesecake', price: 779 },
  { name: 'Classic Black Forest Cake', price: 549 },
  { name: 'Choco Truffle Cake Made With KitKat', price: 649 },
  { name: 'Belgian Chocolate Cake', price: 649 },
  { name: 'Chocolate Ganache Truffle Cake', price: 549 },
  { name: 'Rosy Petals Heart Cake', price: 749 },
  { name: 'Choco Dream Cake', price: 649 },
  { name: 'Red Velvet Heart Shape Cake', price: 799 },
  { name: 'Roses Topped Vanilla Cream Cake', price: 1149 },
  { name: 'Velvet Chocolate Truffle Cake', price: 549 },
  { name: 'German Black Forest Cake', price: 559 },
  { name: 'Pink Princess Barbie Cake', price: 1479 },
  { name: 'Chocolate Snicker Cake', price: 649 },
  { name: 'Rosey Heart Choco Truffle Cake', price: 749 },
  { name: 'Birthday Photo Cake', price: 689 },
  { name: 'Rasmalai Pista Whipped Cream Cake', price: 675 },
  { name: 'Red Velvet Coffee Drip Cream Cake', price: 599 },
  { name: 'Velvety Chocolate Truffle Cake', price: 549, isDuplicateOf: 'Velvet Chocolate Truffle Cake' },
  { name: 'Happy Birthday Chocolate Pastries', price: 199 },
  { name: 'Red Velvet Jar Cake', price: 139 },
  { name: 'Jungle Paradise Theme Cake', price: 1499 },
  { name: 'Barbie Floral Gown Cake', price: 1569 },
  { name: 'Blueberry Vanilla Cake', price: 599 },
  { name: 'Glazed German Black Forest Cake', price: 599 },
  { name: 'Classic Chocolate Truffle Pastry', price: 99 },
  { name: 'Marble Chocolate Cake', price: 549 },
  { name: 'Ferrero Infused Celebration Cake', price: 779 },
  { name: 'Hearts Of Love Chocolate Cake', price: 749 },
  { name: 'Pink & Orange Red Velvet Cake', price: 689 },
  { name: 'Fruits & Sprinkles Vanilla Cake', price: 649 },
  { name: 'Trio Mousse Cake', price: 649 },
  { name: 'Butterscotch Crunch Designer Cake', price: 549 },
  { name: 'Love N Rose Cake', price: 675 },
  { name: 'Choco Vanilla Delight Cake', price: 549 },
  { name: 'Ferrero Rocher Pinata Cake', price: 1289 },
  { name: 'Happy Birthday Chocolate Photo Cake', price: 689 },
  { name: 'Chocolate Truffle Fresh Fruit Cake', price: 799 },
  { name: 'Red Velvet Elegance Cake', price: 649 },
  { name: 'Tropical Pineapple Cake', price: 549 },
  { name: 'Fondant Theme Beer Mug Cake', price: 2379 },
  { name: 'Floral Drip Cake', price: 1189 },
  { name: 'French La Opera Coffee Choco Cake', price: 649 },
  { name: 'Blueberry Heaven Pull Me Up Cake', price: 1379 },
  { name: 'Pink Almond Rocher Dessert', price: 219 },
  { name: 'Assorted Pastry Box', price: 199 },
  { name: 'Chocolate Mud Jar Cake', price: 139 },
  { name: 'Choco Mousse Verrine Cup No Added Sugar', price: 209 },
  { name: 'Mango Shape Dessert', price: 249 },
  { name: 'Kunafa Chocolate Tub', price: 269 },
  { name: 'Dark Chocolate Scoop Cookie', price: 209 },
  { name: 'Assorted Cupcake Indulgence Box', price: 169 },
  { name: 'Blueberry Jar Cake', price: 139 },
  { name: 'No More Single Beer Bachelor Cake', price: 1699 },
  { name: 'Beer Love Theme Cake', price: 1469 },
  { name: 'Blue Label Whiskey Theme Cake', price: 1239 },
  { name: 'Cheers To Beer Celebration Cake', price: 1379 },
  { name: 'Tuborg Beer Themed Cake', price: 1379 },
  { name: 'Cheers Beer Mug Cake', price: 1469 },
  { name: 'Cheers To Forty Beer Cake', price: 1469 },
  { name: 'The Heineken Beer Theme Cake', price: 1649 }
];

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

const uniqueProducts = [];
const skippedDuplicates = [];

for (const item of rawProductList) {
  if (item.isDuplicateOf) {
    skippedDuplicates.push(item);
    continue;
  }
  const id = slugify(item.name);
  uniqueProducts.push({
    id,
    name: item.name,
    category: 'pending',
    price: item.price,
    originalPrice: item.price,
    discount: 0,
    rating: 0,
    reviewCount: 0,
    image: '',
    gallery: [],
    deliveryTime: 'Within 12 hours',
    inStock: true,
    description: '',
    ingredients: [],
    allergens: [],
    storageInstructions: '',
    occasions: [],
    variants: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

console.log(`Total raw items: ${rawProductList.length}`);
console.log(`Duplicates skipped: ${skippedDuplicates.length} (${skippedDuplicates.map(d => d.name).join(', ')})`);
console.log(`Unique products prepared: ${uniqueProducts.length}`);

// 1. Write to src/data/db/products.json
const jsonPath = path.resolve('src/data/db/products.json');
fs.writeFileSync(jsonPath, JSON.stringify(uniqueProducts, null, 2), 'utf8');
console.log(`✔ Written ${uniqueProducts.length} prepared products to ${jsonPath}`);

// 2. Persist in PostgreSQL database
async function syncToPostgres() {
  const conn = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRESQL_URL;
  if (!conn) {
    console.log('No direct PostgreSQL connection configured in local env, json persistence ready.');
    return;
  }

  let pool;
  try {
    const url = new URL(conn);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('ssl');
    pool = new Pool({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } });
    
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "products" (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC NOT NULL,
        "originalPrice" NUMERIC,
        image TEXT,
        gallery JSONB,
        category VARCHAR(255) NOT NULL,
        brand VARCHAR(255),
        rating NUMERIC DEFAULT 0,
        "reviewCount" INTEGER DEFAULT 0,
        stock INTEGER DEFAULT 0,
        unit VARCHAR(50),
        "isWellness" BOOLEAN DEFAULT FALSE,
        "wellnessAgeVerifyRequired" BOOLEAN DEFAULT FALSE,
        tags JSONB,
        "inStock" BOOLEAN DEFAULT TRUE,
        "subCategory" VARCHAR(255),
        "discount" NUMERIC DEFAULT 0,
        "deliveryTime" VARCHAR(255),
        "ingredients" JSONB,
        "allergens" JSONB,
        "storageInstructions" TEXT,
        "occasions" JSONB,
        "variants" JSONB,
        "wellnessBrand" VARCHAR(255),
        "wellnessType" VARCHAR(255),
        "wellnessMaterial" VARCHAR(255),
        "wellnessPackSize" VARCHAR(255),
        "wellnessTexture" VARCHAR(255),
        "wellnessFlavor" VARCHAR(255),
        "wellnessVerified" BOOLEAN DEFAULT TRUE,
        "wellnessSku" VARCHAR(255),
        "wellnessDetails" JSONB,
        "createdAt" VARCHAR(255),
        "updatedAt" VARCHAR(255)
      )
    `);

    // Insert or update all 67 products
    let inserted = 0;
    for (const p of uniqueProducts) {
      await pool.query(`
        INSERT INTO "products" (
          id, name, description, price, "originalPrice", discount, image, gallery,
          category, "subCategory", rating, "reviewCount", "inStock", "deliveryTime",
          ingredients, allergens, "storageInstructions", occasions, variants, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          "originalPrice" = EXCLUDED."originalPrice",
          discount = EXCLUDED.discount,
          category = EXCLUDED.category,
          "inStock" = EXCLUDED."inStock",
          "updatedAt" = EXCLUDED."updatedAt"
      `, [
        p.id, p.name, p.description, p.price, p.originalPrice, p.discount, p.image, JSON.stringify(p.gallery),
        p.category, p.subCategory || null, p.rating, p.reviewCount, p.inStock, p.deliveryTime,
        JSON.stringify(p.ingredients), JSON.stringify(p.allergens), p.storageInstructions, JSON.stringify(p.occasions), JSON.stringify(p.variants), p.createdAt, p.updatedAt
      ]);
      inserted++;
    }

    console.log(`✔ Successfully synchronized ${inserted} products to PostgreSQL database.`);
  } catch (err) {
    console.error('PostgreSQL sync error:', err.message);
  } finally {
    if (pool) await pool.end();
  }
}

syncToPostgres();
