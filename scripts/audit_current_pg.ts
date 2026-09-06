import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
}

loadEnvFile();

function getSanitizedConnectionString(raw: string): string {
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('ssl');
    return url.toString();
  } catch {
    return raw;
  }
}

async function audit() {
  const rawConn = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  console.log('PostgreSQL Connection configured:', !!rawConn);

  const pool = new Pool({
    connectionString: getSanitizedConnectionString(rawConn),
    ssl: { rejectUnauthorized: false }
  });

  const canonicalPath = path.resolve('src/data/db/products.json');
  const canonicalProducts: any[] = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
  console.log('Canonical products in products.json:', canonicalProducts.length);

  const canonicalMap = new Map<string, any>();
  canonicalProducts.forEach(p => {
    canonicalMap.set(p.id.toLowerCase().trim(), p);
  });

  // Query DB products
  const dbRes = await pool.query('SELECT id, name, category, price, image FROM products ORDER BY id ASC');
  console.log('\n--- CURRENT POSTGRESQL PRODUCTS ---');
  console.log('Total in PostgreSQL:', dbRes.rows.length);

  const extraInDb: any[] = [];
  const foundCanonicalIds = new Set<string>();
  const duplicateMap = new Map<string, number>();

  for (const row of dbRes.rows) {
    const lowerId = String(row.id || '').toLowerCase().trim();
    duplicateMap.set(lowerId, (duplicateMap.get(lowerId) || 0) + 1);

    if (canonicalMap.has(lowerId)) {
      foundCanonicalIds.add(lowerId);
    } else {
      extraInDb.push(row);
    }
  }

  console.log('Canonical products found in DB:', foundCanonicalIds.size, 'of', canonicalProducts.length);
  console.log('Extra products in DB:', extraInDb.length);
  if (extraInDb.length > 0) {
    console.log('Extra products list:', extraInDb);
  }

  const duplicates = Array.from(duplicateMap.entries()).filter(([_, count]) => count > 1);
  console.log('Duplicates in DB:', duplicates.length);
  if (duplicates.length > 0) {
    console.log('Duplicate IDs:', duplicates);
  }

  const missingCanonical = canonicalProducts.filter(p => !foundCanonicalIds.has(p.id.toLowerCase().trim()));
  console.log('Missing canonical in DB:', missingCanonical.length);
  if (missingCanonical.length > 0) {
    console.log('Missing products list:', missingCanonical.map(m => ({ id: m.id, name: m.name })));
  }

  await pool.end();
}

audit().catch(console.error);
