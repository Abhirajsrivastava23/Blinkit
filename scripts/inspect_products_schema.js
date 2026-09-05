const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

async function run() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    console.log('No database URL');
    return;
  }
  const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'products'
      ORDER BY ordinal_position;
    `);
    console.log('--- PRODUCTS COLUMNS ---');
    console.table(cols.rows);

    const count = await pool.query('SELECT count(*) FROM products');
    console.log('PRODUCTS COUNT:', count.rows[0]);

    const sample = await pool.query('SELECT * FROM products LIMIT 2');
    console.log('--- SAMPLE ROWS ---');
    console.log(JSON.stringify(sample.rows, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
