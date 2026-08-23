import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool } from 'pg';

export interface AuditLogRecord {
  id: string;
  adminUser: string;
  action: string;
  dateTime: string;
  product: string;
  previousValue: string;
  newValue: string;
}

export interface AdminRecord {
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  role: 'admin';
}

export interface PartnerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: 'delivery_partner';
  locationId: 'nawabganj-unnao' | 'chandigarh-university-up';
  locationName: string;
  status: 'Active' | 'Inactive';
  isOnline: boolean;
}

// Local filesystem seeding configuration (seeding source only)
const SEED_DIR = path.join(process.cwd(), 'src/data/db');

const FILE_NAMES: Record<string, string> = {
  products: 'products.json',
  categories: 'categories.json',
  brands: 'brands.json',
  auditLogs: 'audit_logs.json',
  homepage: 'homepage.json',
  users: 'users.json',
  orders: 'orders.json',
  admin: 'admin.json',
  partners: 'partners.json',
  sessions: 'sessions.json',
  inventoryIssues: 'inventory_issues.json'
};

// PostgreSQL pool connection caching for Serverless envs
const connectionString = (
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  ''
).trim();

let pool: Pool | null = null;
let dbInitError = '';

if (connectionString) {
  try {
    const globalWithPg = global as typeof globalThis & {
      _pgPool?: Pool;
    };
    if (!globalWithPg._pgPool) {
      globalWithPg._pgPool = new Pool({
        connectionString,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 10000,
        max: 10,
        ssl: {
          rejectUnauthorized: false
        }
      });
    }
    pool = globalWithPg._pgPool;
  } catch (err) {
    console.error('Failed to initialize PostgreSQL pool:', err);
    dbInitError = err instanceof Error ? err.message : String(err);
  }
} else {
  dbInitError = 'PostgreSQL connection URL (POSTGRES_URL/DATABASE_URL) is missing';
}

let isSchemaCreated = false;
let isSchemaCreating = false;

async function ensureSchema(p: Pool) {
  if (isSchemaCreated || isSchemaCreating) return;
  isSchemaCreating = true;
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        image VARCHAR(255),
        "itemCount" INTEGER DEFAULT 0
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        logo VARCHAR(255),
        "itemCount" INTEGER DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC NOT NULL,
        "originalPrice" NUMERIC,
        image VARCHAR(255),
        category VARCHAR(255) NOT NULL,
        brand VARCHAR(255),
        rating NUMERIC DEFAULT 0,
        reviews INTEGER DEFAULT 0,
        stock INTEGER DEFAULT 0,
        unit VARCHAR(50),
        "isWellness" BOOLEAN DEFAULT FALSE,
        "wellnessAgeVerifyRequired" BOOLEAN DEFAULT FALSE,
        tags JSONB
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        "userId" VARCHAR(255) PRIMARY KEY,
        "googleProviderId" VARCHAR(255),
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        "profileImage" VARCHAR(255),
        "createdAt" VARCHAR(255),
        "lastLoginAt" VARCHAR(255),
        "wellnessAccessStatus" VARCHAR(255),
        "wellnessRequestId" VARCHAR(255),
        "wellnessApprovedAt" VARCHAR(255),
        "wellnessApprovedBy" VARCHAR(255),
        phone VARCHAR(255),
        dob VARCHAR(255),
        gender VARCHAR(255),
        addresses JSONB
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        "sessionId" VARCHAR(255) PRIMARY KEY,
        "userId" VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        "expiresAt" VARCHAR(255) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS admin (
        email VARCHAR(255) PRIMARY KEY,
        "passwordHash" VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        phone VARCHAR(255),
        role VARCHAR(50) DEFAULT 'admin'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS partners (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'delivery_partner',
        "locationId" VARCHAR(255),
        "locationName" VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        "isOnline" BOOLEAN DEFAULT FALSE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS config (
        key VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "inventoryIssues" (
        id VARCHAR(255) PRIMARY KEY,
        "productId" VARCHAR(255) NOT NULL,
        "productName" VARCHAR(255),
        issue VARCHAR(255),
        status VARCHAR(255),
        "createdAt" VARCHAR(255)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "auditLogs" (
        id VARCHAR(255) PRIMARY KEY,
        "adminUser" VARCHAR(255),
        action VARCHAR(255),
        "dateTime" VARCHAR(255),
        product VARCHAR(255),
        "previousValue" TEXT,
        "newValue" TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        "customerId" VARCHAR(255) NOT NULL,
        items JSONB NOT NULL,
        subtotal NUMERIC NOT NULL,
        "deliveryFee" NUMERIC DEFAULT 0,
        discount NUMERIC DEFAULT 0,
        total NUMERIC NOT NULL,
        address JSONB NOT NULL,
        status VARCHAR(255) NOT NULL,
        "deliveryOption" VARCHAR(255),
        eta VARCHAR(255),
        "createdAt" VARCHAR(255) NOT NULL,
        "deliveryLocationId" VARCHAR(255),
        "deliveryLocationName" VARCHAR(255),
        "deliveryOtp" VARCHAR(255),
        "otpFailedAttempts" INTEGER DEFAULT 0,
        "otpExpiresAt" VARCHAR(255),
        "statusHistory" JSONB,
        "assignedPartnerId" VARCHAR(255),
        "assignedPartnerName" VARCHAR(255),
        "assignedAt" VARCHAR(255)
      );
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders("customerId")');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_assigned_partner_id ON orders("assignedPartnerId")');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId")');

    await client.query('COMMIT');
    isSchemaCreated = true;
    console.log('PostgreSQL schema and indexes initialized.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to initialize PostgreSQL schema:', err);
    throw err;
  } finally {
    client.release();
    isSchemaCreating = false;
  }
}

async function insertRow(p: Pool, table: string, item: Record<string, unknown>) {
  const keys = Object.keys(item);
  const cols = keys.map(k => {
    if (k === 'itemCount' || k === 'originalPrice' || k === 'isWellness' || 
        k === 'wellnessAgeVerifyRequired' || k === 'userId' || k === 'googleProviderId' || 
        k === 'profileImage' || k === 'createdAt' || k === 'lastLoginAt' || 
        k === 'wellnessAccessStatus' || k === 'wellnessRequestId' || 
        k === 'wellnessApprovedAt' || k === 'wellnessApprovedBy' || 
        k === 'sessionId' || k === 'expiresAt' || k === 'passwordHash' || 
        k === 'locationId' || k === 'locationName' || k === 'isOnline' || 
        k === 'productId' || k === 'productName' || k === 'adminUser' || 
        k === 'dateTime' || k === 'previousValue' || k === 'newValue' || 
        k === 'customerId' || k === 'deliveryFee' || k === 'deliveryOption' || 
        k === 'deliveryLocationId' || k === 'deliveryLocationName' || 
        k === 'deliveryOtp' || k === 'otpFailedAttempts' || k === 'otpExpiresAt' || 
        k === 'statusHistory' || k === 'assignedPartnerId' || 
        k === 'assignedPartnerName' || k === 'assignedAt') {
      return `"${k}"`;
    }
    return k;
  }).join(', ');
  
  const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
  const queryText = `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING`;
  
  const queryVals = keys.map(k => {
    const v = item[k];
    if (v && typeof v === 'object') {
      return JSON.stringify(v);
    }
    return v;
  });
  
  await p.query(queryText, queryVals);
}

let isSeeding = false;
let isSeeded = false;

async function ensureSeeded(p: Pool) {
  if (isSeeded || isSeeding) return;
  isSeeding = true;
  try {
    const salt = process.env['AUTH_SECRET'] || 'fatafat_salt';
    const hash = crypto.createHash('sha256').update('admin123' + salt).digest('hex');
    const riderHash = crypto.createHash('sha256').update('rider123' + salt).digest('hex');

    const tableKeys: Array<'products' | 'categories' | 'brands' | 'admin' | 'partners' | 'users' | 'orders' | 'inventoryIssues' | 'auditLogs' | 'sessions'> = [
      'admin', 'partners', 'categories', 'brands', 'products', 'users', 'orders', 'inventoryIssues', 'auditLogs', 'sessions'
    ];

    for (const key of tableKeys) {
      const tableName = key === 'inventoryIssues' ? 'inventoryIssues' : key === 'auditLogs' ? 'auditLogs' : key;
      const countRes = await p.query(`SELECT COUNT(*) FROM "${tableName}"`);
      const count = parseInt(countRes.rows[0].count, 10);
      
      if (count === 0) {
        let seedData: unknown[] = [];
        if (key === 'admin') {
          seedData = [
            { email: 'superadmin@fatafat.com', passwordHash: hash, name: 'FATAFAT Super Admin', phone: '9999999990', role: 'admin' },
            { email: 'admin@fatafat.com', passwordHash: hash, name: 'FATAFAT Ops Admin', phone: '9999999991', role: 'admin' },
            { email: 'manager@fatafat.com', passwordHash: hash, name: 'FATAFAT Inv Manager', phone: '9999999992', role: 'admin' },
            { email: 'admin@fatafat.local', passwordHash: hash, name: 'Local Dev Admin', phone: '9999999993', role: 'admin' }
          ];
        } else if (key === 'partners') {
          seedData = [
            { id: 'DP-001', name: 'Rahul', phone: '9999999999', email: 'rider@fatafat.com', passwordHash: riderHash, role: 'delivery_partner', locationId: 'nawabganj-unnao', locationName: 'Nawabganj, Unnao', status: 'Active', isOnline: true },
            { id: 'DP-002', name: 'Aman', phone: '8888888888', email: 'aman_rider@fatafat.com', passwordHash: riderHash, role: 'delivery_partner', locationId: 'chandigarh-university-up', locationName: 'Chandigarh University, Uttar Pradesh', status: 'Active', isOnline: false },
            { id: 'DP-003', name: 'Rider Local', phone: '7777777777', email: 'rider@fatafat.local', passwordHash: riderHash, role: 'delivery_partner', locationId: 'nawabganj-unnao', locationName: 'Nawabganj, Unnao', status: 'Active', isOnline: true }
          ];
        } else {
          const seedFilePath = path.join(SEED_DIR, FILE_NAMES[key]);
          if (fs.existsSync(seedFilePath)) {
            const content = fs.readFileSync(seedFilePath, 'utf8');
            seedData = JSON.parse(content);
          }
        }

        if (key === 'orders' && Array.isArray(seedData)) {
          seedData = seedData.filter((o) => {
            const ord = o as Record<string, unknown>;
            return !!(ord && ord.id && typeof ord.id === 'string' && !ord.id.startsWith('FT-TEST-'));
          });
        }

        if (Array.isArray(seedData) && seedData.length > 0) {
          for (const item of seedData) {
            await insertRow(p, tableName, item as Record<string, unknown>);
          }
          console.log(`Seeded PostgreSQL table "${tableName}" successfully.`);
        }
      }
    }

    const configCount = await p.query("SELECT COUNT(*) FROM config WHERE key = 'homepage'");
    if (parseInt(configCount.rows[0].count, 10) === 0) {
      const seedFilePath = path.join(SEED_DIR, 'homepage.json');
      if (fs.existsSync(seedFilePath)) {
        const content = fs.readFileSync(seedFilePath, 'utf8');
        const data = JSON.parse(content);
        await p.query(
          'INSERT INTO config (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
          ['homepage', JSON.stringify(data)]
        );
        console.log('Seeded homepage config successfully.');
      }
    }

    isSeeded = true;
  } catch (err) {
    console.error('Failed to seed PostgreSQL:', err);
  } finally {
    isSeeding = false;
  }
}

export const db = {
  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    if (dbInitError) {
      return { ok: false, error: dbInitError };
    }
    if (!pool) {
      return { ok: false, error: 'PostgreSQL connection pool is not configured' };
    }
    try {
      const res = await pool.query('SELECT NOW()');
      if (res.rows.length > 0) {
        return { ok: true };
      }
      return { ok: false, error: 'Query executed but returned no results' };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  async readTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders' | 'admin' | 'partners' | 'sessions' | 'inventoryIssues'): Promise<T[]> {
    if (!pool) {
      throw new Error(`Database connection URL is missing. Failed to read table ${key}`);
    }
    await ensureSchema(pool);
    await ensureSeeded(pool);
    
    try {
      const tableName = key === 'inventoryIssues' ? 'inventoryIssues' : key === 'auditLogs' ? 'auditLogs' : key;
      const res = await pool.query(`SELECT * FROM "${tableName}"`);
      
      return res.rows.map(row => {
        const parsed: Record<string, unknown> = {};
        for (const col of Object.keys(row)) {
          const val = row[col];
          if (col === 'tags' || col === 'addresses' || col === 'items' || col === 'statusHistory' || col === 'address') {
            if (typeof val === 'string') {
              try {
                parsed[col] = JSON.parse(val);
              } catch {
                parsed[col] = val;
              }
            } else {
              parsed[col] = val;
            }
          } else {
            parsed[col] = val;
          }
        }
        return parsed;
      }) as unknown as T[];
    } catch (err) {
      console.error(`PostgreSQL error reading table ${key}:`, err);
      throw err;
    }
  },

  async writeTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders' | 'admin' | 'partners' | 'sessions' | 'inventoryIssues', data: T[]): Promise<boolean> {
    if (!pool) {
      throw new Error(`Database connection URL is missing. Failed to write table ${key}`);
    }
    await ensureSchema(pool);
    await ensureSeeded(pool);
    
    const tableName = key === 'inventoryIssues' ? 'inventoryIssues' : key === 'auditLogs' ? 'auditLogs' : key;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM "${tableName}"`);
      
      for (const item of data) {
        const record = item as Record<string, unknown>;
        const keys = Object.keys(record);
        if (keys.length === 0) continue;
        
        const cols = keys.map(k => {
          if (k === 'itemCount' || k === 'originalPrice' || k === 'isWellness' || 
              k === 'wellnessAgeVerifyRequired' || k === 'userId' || k === 'googleProviderId' || 
              k === 'profileImage' || k === 'createdAt' || k === 'lastLoginAt' || 
              k === 'wellnessAccessStatus' || k === 'wellnessRequestId' || 
              k === 'wellnessApprovedAt' || k === 'wellnessApprovedBy' || 
              k === 'sessionId' || k === 'expiresAt' || k === 'passwordHash' || 
              k === 'locationId' || k === 'locationName' || k === 'isOnline' || 
              k === 'productId' || k === 'productName' || k === 'adminUser' || 
              k === 'dateTime' || k === 'previousValue' || k === 'newValue' || 
              k === 'customerId' || k === 'deliveryFee' || k === 'deliveryOption' || 
              k === 'deliveryLocationId' || k === 'deliveryLocationName' || 
              k === 'deliveryOtp' || k === 'otpFailedAttempts' || k === 'otpExpiresAt' || 
              k === 'statusHistory' || k === 'assignedPartnerId' || 
              k === 'assignedPartnerName' || k === 'assignedAt') {
            return `"${k}"`;
          }
          return k;
        }).join(', ');
        
        const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
        const queryText = `INSERT INTO "${tableName}" (${cols}) VALUES (${vals})`;
        
        const queryVals = keys.map(k => {
          const v = record[k];
          if (v && typeof v === 'object') {
            return JSON.stringify(v);
          }
          return v;
        });
        
        await client.query(queryText, queryVals);
      }
      
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`PostgreSQL error writing table ${key}:`, err);
      return false;
    } finally {
      client.release();
    }
  },

  async readHomepage(): Promise<Record<string, unknown>> {
    if (!pool) return {};
    await ensureSchema(pool);
    await ensureSeeded(pool);
    try {
      const res = await pool.query("SELECT data FROM config WHERE key = 'homepage'");
      if (res.rows.length > 0) {
        const val = res.rows[0].data;
        if (typeof val === 'string') {
          return JSON.parse(val);
        }
        return val || {};
      }
      return {};
    } catch (err) {
      console.error('PostgreSQL error reading homepage config:', err);
      return {};
    }
  },

  async writeHomepage(data: Record<string, unknown>): Promise<boolean> {
    if (!pool) return false;
    await ensureSchema(pool);
    await ensureSeeded(pool);
    try {
      await pool.query(
        'INSERT INTO config (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
        ['homepage', JSON.stringify(data)]
      );
      return true;
    } catch (err) {
      console.error('PostgreSQL error writing homepage config:', err);
      return false;
    }
  },

  async logActivity(adminUser: string, action: string, product: string, previousValue: string, newValue: string) {
    if (!pool) return;
    await ensureSchema(pool);
    await ensureSeeded(pool);
    try {
      const newLog = {
        id: `log-${Date.now()}`,
        adminUser,
        action,
        dateTime: new Date().toISOString(),
        product,
        previousValue,
        newValue
      };
      await insertRow(pool, 'auditLogs', newLog);
    } catch (err) {
      console.error('PostgreSQL error logging activity:', err);
    }
  }
};
