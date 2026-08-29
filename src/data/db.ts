import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';

import productsJson from './db/products.json';
import categoriesJson from './db/categories.json';
import brandsJson from './db/brands.json';
import homepageJson from './db/homepage.json';
import inventoryIssuesJson from './db/inventory_issues.json';
import auditLogsJson from './db/audit_logs.json';
import ordersJson from './db/orders.json';
import sessionsJson from './db/sessions.json';
import usersJson from './db/users.json';


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
      const parsedUrl = new URL(connectionString);
      globalWithPg._pgPool = new Pool({
        user: decodeURIComponent(parsedUrl.username || ''),
        password: decodeURIComponent(parsedUrl.password || ''),
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port || '5432', 10),
        database: parsedUrl.pathname.substring(1),
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 3000,
        max: 2,
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

const ALLOWED_COLUMNS: Record<string, string[]> = {
  categories: ['id', 'name', 'slug', 'description', 'status', 'image', 'itemCount'],
  brands: ['id', 'name', 'slug', 'description', 'status', 'website', 'logo', 'itemCount'],
  products: ['id', 'name', 'description', 'price', 'originalPrice', 'image', 'category', 'brand', 'rating', 'reviews', 'stock', 'unit', 'isWellness', 'wellnessAgeVerifyRequired', 'tags'],
  users: ['userId', 'googleProviderId', 'name', 'email', 'profileImage', 'createdAt', 'lastLoginAt', 'wellnessAccessStatus', 'wellnessRequestId', 'wellnessApprovedAt', 'wellnessApprovedBy', 'phone', 'dob', 'gender', 'addresses'],
  sessions: ['sessionId', 'userId', 'email', 'role', 'expiresAt'],
  admin: ['email', 'passwordHash', 'name', 'phone', 'role'],
  partners: ['id', 'name', 'phone', 'email', 'passwordHash', 'role', 'locationId', 'locationName', 'status', 'isOnline'],
  config: ['key', 'data'],
  inventoryIssues: ['id', 'productId', 'productName', 'issue', 'status', 'createdAt'],
  auditLogs: ['id', 'adminUser', 'action', 'dateTime', 'product', 'previousValue', 'newValue'],
  orders: ['id', 'customerId', 'items', 'subtotal', 'deliveryFee', 'discount', 'total', 'address', 'status', 'deliveryOption', 'eta', 'createdAt', 'deliveryLocationId', 'deliveryLocationName', 'deliveryOtp', 'otpFailedAttempts', 'otpExpiresAt', 'statusHistory', 'assignedPartnerId', 'assignedPartnerName', 'assignedAt']
};

async function insertRow(p: Pool, table: string, item: Record<string, unknown>) {
  const allowed = ALLOWED_COLUMNS[table];
  const keys = Object.keys(item).filter(k => !allowed || allowed.includes(k));
  if (keys.length === 0) return;
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

async function bulkInsert(client: PoolClient, table: string, items: Record<string, unknown>[]) {
  if (items.length === 0) return;
  const allowed = ALLOWED_COLUMNS[table];
  for (const item of items) {
    const keys = Object.keys(item).filter(k => !allowed || allowed.includes(k));
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
    const queryText = `INSERT INTO "${table}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING`;
    
    const queryVals = keys.map(k => {
      const v = item[k];
      if (v && typeof v === 'object') {
        return JSON.stringify(v);
      }
      return v;
    });
    await client.query(queryText, queryVals);
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

  async query<T extends Record<string, unknown> = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }> {
    if (!pool) {
      throw new Error('Database connection URL is missing');
    }
    const res = await pool.query(text, params);
    return {
      rows: res.rows.map(row => {
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
      }) as T[]
    };
  },

  async readTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders' | 'admin' | 'partners' | 'sessions' | 'inventoryIssues'): Promise<T[]> {
    if (!pool) {
      throw new Error(`Database connection URL is missing. Failed to read table ${key}`);
    }
    
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
    
    const tableName = key === 'inventoryIssues' ? 'inventoryIssues' : key === 'auditLogs' ? 'auditLogs' : key;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM "${tableName}"`);
      
      for (const item of data) {
        const record = item as Record<string, unknown>;
        const allowed = ALLOWED_COLUMNS[key];
        const keys = Object.keys(record).filter(k => !allowed || allowed.includes(k));
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
  },

  async seedDatabase(): Promise<{ success: boolean; message?: string; error?: string }> {
    if (!pool) {
      return { success: false, error: 'PostgreSQL connection pool is not configured' };
    }
    
    const client = await pool.connect();
    try {
      // 1. Acquire advisory lock (session level) to prevent concurrent seeding requests
      await client.query('SELECT pg_advisory_lock(123456)');
      
      console.log('Acquired database seeding lock. Starting schema initialization...');
      
      // 2. Create Schema
      await client.query('BEGIN');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255),
          description TEXT,
          status VARCHAR(50),
          image VARCHAR(255),
          "itemCount" INTEGER DEFAULT 0
        );
      `);
      await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT');
      await client.query('ALTER TABLE categories ADD COLUMN IF NOT EXISTS status VARCHAR(50)');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS brands (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(255),
          description TEXT,
          status VARCHAR(50),
          website VARCHAR(255),
          logo VARCHAR(255),
          "itemCount" INTEGER DEFAULT 0
        );
      `);
      await client.query('ALTER TABLE brands ADD COLUMN IF NOT EXISTS description TEXT');
      await client.query('ALTER TABLE brands ADD COLUMN IF NOT EXISTS status VARCHAR(50)');
      await client.query('ALTER TABLE brands ADD COLUMN IF NOT EXISTS website VARCHAR(255)');

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

      await client.query(`
        CREATE TABLE IF NOT EXISTS wellness_terms_acceptances (
          "customerId" VARCHAR(255) PRIMARY KEY,
          "termsVersion" VARCHAR(255) NOT NULL,
          "acceptedAt" VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS delivery_photos (
          id VARCHAR(255) PRIMARY KEY,
          "orderId" VARCHAR(255) NOT NULL,
          "partnerId" VARCHAR(255) NOT NULL,
          "photoUrl" TEXT NOT NULL,
          category VARCHAR(255) NOT NULL,
          "uploadedAt" VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wellness_access_requests (
          id VARCHAR(255) PRIMARY KEY,
          "customerId" VARCHAR(255) NOT NULL,
          "customerName" VARCHAR(255) NOT NULL,
          "customerEmail" VARCHAR(255) NOT NULL,
          "requestedAt" VARCHAR(255) NOT NULL,
          status VARCHAR(255) NOT NULL,
          "calculatedAge" INTEGER,
          "reviewedBy" VARCHAR(255),
          "reviewedAt" VARCHAR(255),
          "rejectionReason" TEXT
        );
      `);

      await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders("customerId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_orders_assigned_partner_id ON orders("assignedPartnerId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId")');

      await client.query('COMMIT');
      
      console.log('PostgreSQL schema initialized. Starting data seeding...');
      
      // 3. Seed Tables Idempotently (ON CONFLICT DO NOTHING)
      const salt = process.env['AUTH_SECRET'] || 'fatafat_salt';
      
      // Seed Admins - exactly ONE super admin
      const adminPasswordInput = process.env.ADMIN_PASSWORD || 'superadmin123';
      const adminHash = crypto.createHash('sha256').update(adminPasswordInput + salt).digest('hex');
      const adminsSeed = [
        { email: 'superadmin@fatafat.com', passwordHash: adminHash, name: 'FATAFAT Super Admin', phone: '9999999990', role: 'admin' }
      ];
      await bulkInsert(client, 'admin', adminsSeed);
      
      // Actively purge fake/demo production data from tables
      await client.query("DELETE FROM orders WHERE id LIKE 'FT-TEST-%' OR id LIKE 'order-test-%'");
      await client.query("DELETE FROM admin WHERE email IN ('admin@fatafat.com', 'manager@fatafat.com', 'admin@fatafat.local')");
      await client.query("DELETE FROM partners WHERE id IN ('DP-001', 'DP-002', 'DP-003')");
      await client.query("DELETE FROM sessions WHERE userId IN ('DP-001', 'DP-002', 'DP-003', 'DP-TEST-99')");
      
      // Seed Categories, Brands, Products, Users, Sessions, InventoryIssues, AuditLogs
      await bulkInsert(client, 'categories', categoriesJson);
      await bulkInsert(client, 'brands', brandsJson);
      await bulkInsert(client, 'products', productsJson);
      await bulkInsert(client, 'users', usersJson);
      await bulkInsert(client, 'inventoryIssues', inventoryIssuesJson);
      await bulkInsert(client, 'auditLogs', auditLogsJson);
      await bulkInsert(client, 'sessions', sessionsJson);

      // Seed Orders (Filter out test orders as requested)
      const ordersSeed = ordersJson.filter((o) => {
        const ord = o as Record<string, unknown>;
        return !!(ord && ord.id && typeof ord.id === 'string' && !ord.id.startsWith('FT-TEST-') && !ord.id.startsWith('order-test-'));
      });
      await bulkInsert(client, 'orders', ordersSeed);

      // Seed homepage config
      const homepageCountRes = await client.query("SELECT COUNT(*) FROM config WHERE key = 'homepage'");
      if (parseInt(homepageCountRes.rows[0].count, 10) === 0) {
        await client.query(
          'INSERT INTO config (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
          ['homepage', JSON.stringify(homepageJson)]
        );
      }

      // Seed wellness settings config
      const wellnessSettingsCount = await client.query("SELECT COUNT(*) FROM config WHERE key = 'wellness_settings'");
      if (parseInt(wellnessSettingsCount.rows[0].count, 10) === 0) {
        await client.query(
          'INSERT INTO config (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
          ['wellness_settings', JSON.stringify({ published: false })]
        );
      }
      
      console.log('Database seeding completed successfully.');
      return { success: true, message: 'Schema and seed data initialized successfully.' };
    } catch (err: unknown) {
      console.error('Error during database seeding:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    } finally {
      // Release advisory lock
      await client.query('SELECT pg_advisory_unlock(123456)');
      client.release();
    }
  }
};
