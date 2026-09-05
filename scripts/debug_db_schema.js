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
console.log('Database URL configured:', !!conn);

if (conn) {
  const pool = new Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  async function run() {
    try {
      const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders'");
      console.log('Orders table columns in DB:', res.rows.map(r => r.column_name));

      const res2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payment_transactions'");
      console.log('Payment_transactions columns in DB:', res2.rows.map(r => r.column_name));

      const ordersCount = await pool.query("SELECT count(id) FROM orders");
      console.log('Total orders in DB:', ordersCount.rows[0].count);

      const recentOrders = await pool.query("SELECT id, total, status FROM orders ORDER BY id DESC LIMIT 10");
      console.log('Recent 10 orders:', recentOrders.rows);
    } catch (e) {
      console.error('DB Error:', e.message);
    } finally {
      await pool.end();
    }
  }
  run();
}
