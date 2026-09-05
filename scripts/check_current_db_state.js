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

const conn = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRESQL_URL;
const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const prods = await pool.query('SELECT count(*) FROM products');
    const users = await pool.query('SELECT count(*) FROM users');
    const orders = await pool.query('SELECT count(*) FROM orders');
    const payments = await pool.query('SELECT count(*) FROM payment_transactions');
    console.log('DB Counts:');
    console.log('  Products:', prods.rows[0].count);
    console.log('  Users:', users.rows[0].count);
    console.log('  Orders:', orders.rows[0].count);
    console.log('  Payments:', payments.rows[0].count);

    const prodSample = await pool.query('SELECT * FROM products LIMIT 5');
    console.log('Product columns:', prodSample.fields.map(f => f.name));
    console.log('Product rows:', prodSample.rows);
  } catch (err) {
    console.error('Error querying DB:', err.message);
  } finally {
    await pool.end();
  }
}

check();
