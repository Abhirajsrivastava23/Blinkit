const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Parse .env.local
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

async function inspectDb() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  console.log('DATABASE URL PRESENT:', Boolean(url));
  if (!url) return;

  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
      ORDER BY ordinal_position;
    `);
    console.log('--- ORDERS COLUMNS ---');
    console.table(cols.rows);

    const constraints = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'orders'::regclass;
    `);
    console.log('--- CONSTRAINTS ---');
    console.table(constraints.rows);

    const recent = await pool.query(`
      SELECT id, "customerId", total, "paymentStatus", status, "createdAt"
      FROM orders
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);
    console.log('--- RECENT 10 ORDERS ---');
    console.table(recent.rows);

    const payTx = await pool.query(`
      SELECT id, "orderId", "customerId", amount, status, utr, "createdAt"
      FROM payment_transactions
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);
    console.log('--- RECENT 10 PAYMENT TRANSACTIONS ---');
    console.table(payTx.rows);
  } catch (err) {
    console.error('Error inspecting database:', err);
  } finally {
    await pool.end();
  }
}

inspectDb();
