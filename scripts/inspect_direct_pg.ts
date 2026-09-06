import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  for (const envFile of ['.env.local', '.env']) {
    const full = path.resolve(envFile);
    if (!fs.existsSync(full)) continue;
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
  }
}

loadEnv();

async function inspectPg() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL;
  console.log('Connecting to PostgreSQL URL:', url ? url.slice(0, 30) + '...' : 'NONE');
  if (!url) {
    console.error('No PostgreSQL URL configured');
    return;
  }

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query('SELECT count(*) FROM "products"');
    console.log('PostgreSQL "products" count:', res.rows[0].count);

    const sample = await pool.query('SELECT id, name, image, "updatedAt" FROM "products" LIMIT 5');
    console.log('Sample rows in PostgreSQL:', sample.rows);

    const checkC1 = await pool.query('SELECT id, name, image, "updatedAt" FROM "products" WHERE LOWER(id) = \'tropical-fruit-n-almond-cake\'');
    console.log('tropical-fruit-n-almond-cake row:', checkC1.rows);
  } catch (err) {
    console.error('Error querying PostgreSQL directly:', err);
  } finally {
    await pool.end();
  }
}

inspectPg().catch(console.error);
