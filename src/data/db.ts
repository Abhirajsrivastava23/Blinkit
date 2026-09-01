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
import partnersJson from './db/partners.json';
import usersJson from './db/users.json';
import adminJson from './db/admin.json';


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

const inMemoryData: Record<string, Record<string, unknown>[]> = {
  products: [...productsJson],
  categories: [...categoriesJson],
  brands: [...brandsJson],
  inventoryIssues: [...inventoryIssuesJson],
  auditLogs: [...auditLogsJson],
  orders: [...ordersJson],
  sessions: [...sessionsJson],
  partners: [...partnersJson],
  users: [...usersJson],
  admin: [...adminJson],
  payment_transactions: [],
  product_image_history: [],
};

const inMemoryConfig: Record<string, unknown> = {
  wellness_settings: { published: false },
  homepage: homepageJson
};

const ALLOWED_COLUMNS: Record<string, string[]> = {
  categories: ['id', 'name', 'slug', 'description', 'status', 'image', 'itemCount'],
  brands: ['id', 'name', 'slug', 'description', 'status', 'website', 'logo', 'itemCount'],
  products: ['id', 'name', 'description', 'price', 'originalPrice', 'image', 'gallery', 'category', 'brand', 'rating', 'reviews', 'stock', 'unit', 'isWellness', 'wellnessAgeVerifyRequired', 'tags', 'inStock'],
  users: ['userId', 'googleProviderId', 'name', 'email', 'profileImage', 'createdAt', 'lastLoginAt', 'wellnessAccessStatus', 'wellnessRequestId', 'wellnessApprovedAt', 'wellnessApprovedBy', 'phone', 'dob', 'gender', 'addresses'],
  sessions: ['sessionId', 'userId', 'email', 'role', 'expiresAt'],
  admin: ['email', 'passwordHash', 'name', 'phone', 'role'],
  partners: ['id', 'name', 'phone', 'email', 'passwordHash', 'role', 'locationId', 'locationName', 'status', 'isOnline'],
  config: ['key', 'data'],
  inventoryIssues: ['id', 'productId', 'productName', 'issue', 'status', 'createdAt'],
  auditLogs: ['id', 'adminUser', 'action', 'dateTime', 'product', 'previousValue', 'newValue'],
  orders: ['id', 'customerId', 'customerEmail', 'items', 'subtotal', 'deliveryFee', 'discount', 'total', 'address', 'status', 'deliveryOption', 'eta', 'createdAt', 'updatedAt', 'deliveryLocationId', 'deliveryLocationName', 'deliveryOtp', 'otpFailedAttempts', 'otpExpiresAt', 'statusHistory', 'assignedPartnerId', 'assignedPartnerName', 'assignedAt', 'paymentStatus', 'paymentMethod', 'scheduledDeliveryAt', 'cancellationReason', 'cancelledAt', 'delivery_otp_verified', 'otp_verified_at', 'verified_by_partner_id', 'delivery_completed_at', 'adminOverride', 'paymentId'],
  product_image_history: ['id', 'productId', 'storagePath', 'imageUrl', 'uploadedBy', 'uploadedByRole', 'uploadedAt', 'previousImage', 'isActive'],
  payment_transactions: ['id', 'orderId', 'customerId', 'amount', 'currency', 'status', 'method', 'provider', 'transactionReference', 'utr', 'proofImageUrl', 'submittedAt', 'verifiedAt', 'verifiedBy', 'rejectedAt', 'rejectedBy', 'rejectionReason', 'paymentProofType', 'paymentProofSize', 'createdAt', 'updatedAt', 'paidAt', 'failureReason', 'attemptCount', 'lastAttemptAt', 'metadata']
};

async function insertRow(p: Pool, table: string, item: Record<string, unknown>) {
  const allowed = ALLOWED_COLUMNS[table];
  const keys = Object.keys(item).filter(k => !allowed || allowed.includes(k));
  if (keys.length === 0) return;
  const cols = keys.map(k => `"${k}"`).join(', ');
  
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
    const cols = keys.map(k => `"${k}"`).join(', ');
    
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
    if (dbInitError && !pool) {
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
      // Local fallback for basic queries if pool is not configured
      const lower = text.toLowerCase();
      if (lower.includes('select') && lower.includes('orders') && lower.includes('id =') && params && params[0]) {
        const orderId = String(params[0]);
        const list = inMemoryData['orders'] || [];
        const found = list.filter((o: Record<string, unknown>) => String(o.id) === orderId);
        return { rows: found as T[] };
      }
      if (lower.includes('select') && lower.includes('payment_transactions') && params && params[0]) {
        const idVal = String(params[0]);
        const list = inMemoryData['payment_transactions'] || [];
        const found = list.filter((p: Record<string, unknown>) => String(p.id) === idVal || String(p.orderId) === idVal);
        return { rows: found as T[] };
      }
      if (lower.includes('update payment_transactions') && params) {
        return { rows: [] };
      }
      if (lower.includes('update orders') && params) {
        return { rows: [] };
      }
      return { rows: [] };
    }
    const res = await pool.query(text, params);
    return {
      rows: res.rows.map(row => {
        const parsed: Record<string, unknown> = {};
        for (const col of Object.keys(row)) {
          const val = row[col];
          if (col === 'tags' || col === 'addresses' || col === 'items' || col === 'statusHistory' || col === 'address' || col === 'adminOverride' || col === 'metadata') {
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

  async readTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders' | 'admin' | 'partners' | 'sessions' | 'inventoryIssues' | 'product_image_history' | 'payment_transactions'): Promise<T[]> {
    if (!pool) {
      return (inMemoryData[key] || []) as unknown as T[];
    }
    
    try {
      const tableName = key === 'inventoryIssues' ? 'inventoryIssues' : key === 'auditLogs' ? 'auditLogs' : key === 'product_image_history' ? 'product_image_history' : key === 'payment_transactions' ? 'payment_transactions' : key;
      const res = await pool.query(`SELECT * FROM "${tableName}"`);
      
      return res.rows.map(row => {
        const parsed: Record<string, unknown> = {};
        for (const col of Object.keys(row)) {
          const val = row[col];
          if (col === 'tags' || col === 'addresses' || col === 'items' || col === 'statusHistory' || col === 'address' || col === 'adminOverride' || col === 'metadata') {
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

        // Normalize PostgreSQL lowercase column names to camelCase
        if (parsed.passwordhash && !parsed.passwordHash) parsed.passwordHash = parsed.passwordhash;
        if (parsed.locationid && !parsed.locationId) parsed.locationId = parsed.locationid;
        if (parsed.locationname && !parsed.locationName) parsed.locationName = parsed.locationname;
        if (parsed.isonline !== undefined && parsed.isOnline === undefined) parsed.isOnline = parsed.isonline;
        if (parsed.customerid && !parsed.customerId) parsed.customerId = parsed.customerid;
        if (parsed.customeremail && !parsed.customerEmail) parsed.customerEmail = parsed.customeremail;
        if (parsed.paymentstatus && !parsed.paymentStatus) parsed.paymentStatus = parsed.paymentstatus;

        return parsed;
      }) as unknown as T[];
    } catch (err) {
      console.error(`PostgreSQL error reading table ${key}:`, err);
      // Fallback to in-memory if DB read fails
      return (inMemoryData[key] || []) as unknown as T[];
    }
  },

  async writeTable<T>(key: 'products' | 'categories' | 'brands' | 'auditLogs' | 'users' | 'orders' | 'admin' | 'partners' | 'sessions' | 'inventoryIssues' | 'product_image_history' | 'payment_transactions', data: T[]): Promise<boolean> {
    inMemoryData[key] = [...data] as unknown as Record<string, unknown>[];
    if (!pool) {
      return true;
    }
    
    const tableName = key === 'inventoryIssues' ? 'inventoryIssues' : key === 'auditLogs' ? 'auditLogs' : key === 'product_image_history' ? 'product_image_history' : key === 'payment_transactions' ? 'payment_transactions' : key;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM "${tableName}"`);
      
      for (const item of data) {
        const record = item as Record<string, unknown>;
        const allowed = ALLOWED_COLUMNS[key];
        const keys = Object.keys(record).filter(k => !allowed || allowed.includes(k));
        if (keys.length === 0) continue;
        
        const cols = keys.map(k => `"${k}"`).join(', ');
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

  /**
   * Payment Transaction Methods
   */
  async getPaymentByOrderId(orderId: string): Promise<Record<string, unknown> | null> {
    if (!pool) {
      const list = inMemoryData['payment_transactions'] || [];
      const found = list.find((p: Record<string, unknown>) => String(p.orderId) === String(orderId));
      return found || null;
    }
    try {
      const res = await pool.query(
        'SELECT * FROM payment_transactions WHERE "orderId" = $1 LIMIT 1',
        [orderId]
      );
      if (res.rows.length === 0) return null;
      return res.rows[0];
    } catch (err) {
      console.error('Error fetching payment by orderId:', err);
      const list = inMemoryData['payment_transactions'] || [];
      return list.find((p: Record<string, unknown>) => String(p.orderId) === String(orderId)) || null;
    }
  },

  async getPaymentById(paymentId: string): Promise<Record<string, unknown> | null> {
    if (!pool) {
      const list = inMemoryData['payment_transactions'] || [];
      const found = list.find((p: Record<string, unknown>) => String(p.id) === String(paymentId));
      return found || null;
    }
    try {
      const res = await pool.query(
        'SELECT * FROM payment_transactions WHERE id = $1 LIMIT 1',
        [paymentId]
      );
      if (res.rows.length === 0) return null;
      return res.rows[0];
    } catch (err) {
      console.error('Error fetching payment by id:', err);
      const list = inMemoryData['payment_transactions'] || [];
      return list.find((p: Record<string, unknown>) => String(p.id) === String(paymentId)) || null;
    }
  },

  async createPayment(payment: Record<string, unknown>): Promise<boolean> {
    const list = inMemoryData['payment_transactions'] || [];
    const idx = list.findIndex((p: Record<string, unknown>) => p.id === payment.id || (payment.orderId && p.orderId === payment.orderId));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payment };
    } else {
      list.push(payment);
    }
    inMemoryData['payment_transactions'] = list;

    if (!pool) {
      return true;
    }
    try {
      const {
        id,
        orderId,
        customerId,
        amount,
        currency,
        status,
        method,
        provider,
        createdAt,
        updatedAt,
        attemptCount,
      } = payment;

      await pool.query(
        `INSERT INTO payment_transactions (id, "orderId", "customerId", amount, currency, status, method, provider, "createdAt", "updatedAt", "attemptCount")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          id,
          orderId,
          customerId,
          amount,
          currency || 'INR',
          status,
          method,
          provider,
          createdAt,
          updatedAt,
          attemptCount || 0,
        ]
      );
      return true;
    } catch (err) {
      console.error('Error creating payment:', err);
      return true;
    }
  },

  async updatePaymentStatus(
    paymentId: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    const list = inMemoryData['payment_transactions'] || [];
    const idx = list.findIndex((p: Record<string, unknown>) => p.id === paymentId);
    const updatedAt = new Date().toISOString();
    const paidAt = status === 'PAID' ? updatedAt : null;
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status,
        updatedAt,
        ...(paidAt ? { paidAt } : {}),
        ...(metadata ? { metadata: { ...((list[idx].metadata as Record<string, unknown>) || {}), ...metadata } } : {})
      };
    }

    if (!pool) {
      return true;
    }
    try {
      let query = `UPDATE payment_transactions SET status = $1, "updatedAt" = $2`;
      const params: unknown[] = [status, updatedAt];

      if (paidAt) {
        query += `, "paidAt" = $${params.length + 1}`;
        params.push(paidAt);
      }

      if (metadata) {
        query += `, metadata = $${params.length + 1}`;
        params.push(JSON.stringify(metadata));
      }

      query += ` WHERE id = $${params.length + 1}`;
      params.push(paymentId);

      await pool.query(query, params);
      return true;
    } catch (err) {
      console.error('Error updating payment status:', err);
      return true;
    }
  },

  async updatePaymentWithReference(
    paymentId: string,
    transactionReference: string,
    status: string
  ): Promise<boolean> {
    const list = inMemoryData['payment_transactions'] || [];
    const idx = list.findIndex((p: Record<string, unknown>) => p.id === paymentId);
    const updatedAt = new Date().toISOString();
    const paidAt = status === 'PAID' ? updatedAt : null;
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        transactionReference,
        status,
        updatedAt,
        ...(paidAt ? { paidAt } : {})
      };
    }

    if (!pool) {
      return true;
    }
    try {
      let query = `UPDATE payment_transactions 
                   SET "transactionReference" = $1, status = $2, "updatedAt" = $3`;
      const params: unknown[] = [transactionReference, status, updatedAt];

      if (paidAt) {
        query += `, "paidAt" = $${params.length + 1}`;
        params.push(paidAt);
      }

      query += ` WHERE id = $${params.length + 1}`;
      params.push(paymentId);

      await pool.query(query, params);
      return true;
    } catch (err) {
      console.error('Error updating payment with reference:', err);
      return true;
    }
  },

  async markPaymentFailed(
    paymentId: string,
    failureReason: string
  ): Promise<boolean> {
    const list = inMemoryData['payment_transactions'] || [];
    const idx = list.findIndex((p: Record<string, unknown>) => p.id === paymentId);
    const updatedAt = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status: 'FAILED',
        failureReason,
        updatedAt
      };
    }

    if (!pool) {
      return true;
    }
    try {
      await pool.query(
        `UPDATE payment_transactions 
         SET status = $1, "failureReason" = $2, "updatedAt" = $3
         WHERE id = $4`,
        ['FAILED', failureReason, updatedAt, paymentId]
      );
      return true;
    } catch (err) {
      console.error('Error marking payment as failed:', err);
      return true;
    }
  },

  async incrementPaymentRetry(paymentId: string): Promise<boolean> {
    const list = inMemoryData['payment_transactions'] || [];
    const idx = list.findIndex((p: Record<string, unknown>) => p.id === paymentId);
    const updatedAt = new Date().toISOString();
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        attemptCount: (Number(list[idx].attemptCount) || 0) + 1,
        lastAttemptAt: updatedAt,
        updatedAt
      };
    }

    if (!pool) {
      return true;
    }
    try {
      await pool.query(
        `UPDATE payment_transactions 
         SET "attemptCount" = "attemptCount" + 1, "lastAttemptAt" = $1, "updatedAt" = $2
         WHERE id = $3`,
        [updatedAt, updatedAt, paymentId]
      );
      return true;
    } catch (err) {
      console.error('Error incrementing payment retry:', err);
      return true;
    }
  },

  async getPaymentHistory(customerId: string, limit: number = 50): Promise<Record<string, unknown>[]> {
    if (!pool) {
      const list = inMemoryData['payment_transactions'] || [];
      return list.filter((p: Record<string, unknown>) => String(p.customerId) === String(customerId)).slice(0, limit);
    }
    try {
      const res = await pool.query(
        `SELECT * FROM payment_transactions 
         WHERE "customerId" = $1 
         ORDER BY "createdAt" DESC 
         LIMIT $2`,
        [customerId, limit]
      );
      return res.rows;
    } catch (err) {
      console.error('Error fetching payment history:', err);
      const list = inMemoryData['payment_transactions'] || [];
      return list.filter((p: Record<string, unknown>) => String(p.customerId) === String(customerId)).slice(0, limit);
    }
  },

  async getConfig<T = any>(key: string): Promise<T | null> {
    if (pool) {
      try {
        const res = await pool.query('SELECT data FROM config WHERE key = $1', [key]);
        if (res.rows.length > 0) {
          const d = res.rows[0].data;
          return typeof d === 'string' ? JSON.parse(d) : (d as T);
        }
      } catch (err) {
        console.error(`Error reading config for ${key}:`, err);
      }
    }
    return (inMemoryConfig[key] as T) || null;
  },

  async setConfig<T = any>(key: string, data: T): Promise<boolean> {
    inMemoryConfig[key] = data;
    if (!pool) return true;
    try {
      await pool.query(
        'INSERT INTO config (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = $2',
        [key, typeof data === 'object' ? JSON.stringify(data) : data]
      );
      return true;
    } catch (err) {
      console.error(`Error writing config for ${key}:`, err);
      return false;
    }
  },

  async getWellnessSettings(): Promise<{ published: boolean }> {
    const config = await this.getConfig<{ published: boolean }>('wellness_settings');
    return config && typeof config.published === 'boolean' ? config : { published: false };
  },

  async setWellnessSettings(published: boolean): Promise<boolean> {
    return this.setConfig('wellness_settings', { published: !!published });
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
          gallery JSONB,
          category VARCHAR(255) NOT NULL,
          brand VARCHAR(255),
          rating NUMERIC DEFAULT 0,
          reviews INTEGER DEFAULT 0,
          stock INTEGER DEFAULT 0,
          unit VARCHAR(50),
          "isWellness" BOOLEAN DEFAULT FALSE,
          "wellnessAgeVerifyRequired" BOOLEAN DEFAULT FALSE,
          tags JSONB,
          "inStock" BOOLEAN DEFAULT TRUE
        );
      `);
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery JSONB');
      await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS "inStock" BOOLEAN DEFAULT TRUE');

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
        CREATE TABLE IF NOT EXISTS delivery_photos (
          id VARCHAR(255) PRIMARY KEY,
          "orderId" VARCHAR(255) NOT NULL,
          "partnerId" VARCHAR(255) NOT NULL,
          "photoUrl" TEXT NOT NULL,
          category VARCHAR(50),
          "uploadedAt" VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS wellness_terms_acceptances (
          "customerId" VARCHAR(255) PRIMARY KEY,
          "termsVersion" VARCHAR(50) NOT NULL,
          "acceptedAt" VARCHAR(255) NOT NULL
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS product_image_history (
          id VARCHAR(255) PRIMARY KEY,
          "productId" VARCHAR(255) NOT NULL,
          "storagePath" TEXT,
          "imageUrl" TEXT NOT NULL,
          "uploadedBy" VARCHAR(255) NOT NULL,
          "uploadedByRole" VARCHAR(50) NOT NULL,
          "uploadedAt" VARCHAR(255) NOT NULL,
          "previousImage" TEXT,
          "isActive" BOOLEAN DEFAULT TRUE
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
          "assignedAt" VARCHAR(255),
          "paymentStatus" VARCHAR(255) DEFAULT 'PENDING',
          "paymentMethod" VARCHAR(255),
          "scheduledDeliveryAt" VARCHAR(255),
          "cancellationReason" TEXT,
          "cancelledAt" VARCHAR(255)
        );
      `);

      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "customerEmail" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "updatedAt" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "delivery_otp_verified" BOOLEAN DEFAULT FALSE');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "otp_verified_at" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "verified_by_partner_id" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "delivery_completed_at" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "adminOverride" JSONB');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentId" VARCHAR(255)');

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

      await client.query(`
        CREATE TABLE IF NOT EXISTS payment_transactions (
          id VARCHAR(255) PRIMARY KEY,
          "orderId" VARCHAR(255) NOT NULL UNIQUE,
          "customerId" VARCHAR(255) NOT NULL,
          amount NUMERIC NOT NULL,
          currency VARCHAR(3) DEFAULT 'INR',
          status VARCHAR(50) NOT NULL,
          method VARCHAR(50) NOT NULL,
          provider VARCHAR(50) NOT NULL,
          "transactionReference" VARCHAR(255),
          utr VARCHAR(255),
          "proofImageUrl" TEXT,
          "submittedAt" VARCHAR(255),
          "verifiedAt" VARCHAR(255),
          "verifiedBy" VARCHAR(255),
          "rejectedAt" VARCHAR(255),
          "rejectedBy" VARCHAR(255),
          "rejectionReason" TEXT,
          "paymentProofType" VARCHAR(50),
          "paymentProofSize" INTEGER,
          "createdAt" VARCHAR(255) NOT NULL,
          "updatedAt" VARCHAR(255) NOT NULL,
          "paidAt" VARCHAR(255),
          "failureReason" TEXT,
          "attemptCount" INTEGER DEFAULT 0,
          "lastAttemptAt" VARCHAR(255),
          metadata JSONB
        );
      `);

      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS utr VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "proofImageUrl" TEXT');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "submittedAt" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "verifiedAt" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "verifiedBy" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "rejectedAt" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "rejectedBy" VARCHAR(255)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "paymentProofType" VARCHAR(50)');
      await client.query('ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS "paymentProofSize" INTEGER');

      await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders("customerId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_orders_assigned_partner_id ON orders("assignedPartnerId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_payment_transactions_customer_id ON payment_transactions("customerId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON payment_transactions("orderId")');
      await client.query('CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_payment_transactions_utr ON payment_transactions(utr)');

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
      await client.query("DELETE FROM admin");
      await bulkInsert(client, 'admin', adminsSeed);
      
       // Actively purge fake/demo production data from tables
      await client.query("DELETE FROM orders WHERE id LIKE 'FT-TEST-%' OR id LIKE 'order-test-%'");
      await client.query("DELETE FROM partners WHERE id IN ('DP-001', 'DP-002', 'DP-003')");
      await client.query("DELETE FROM sessions WHERE \"userId\" IN ('DP-001', 'DP-002', 'DP-003', 'DP-TEST-99')");
      
      // Seed Categories, Brands, Products, Users, Partners, Sessions, InventoryIssues, AuditLogs
      await bulkInsert(client, 'categories', categoriesJson);
      await bulkInsert(client, 'brands', brandsJson);
      await bulkInsert(client, 'products', productsJson);
      await bulkInsert(client, 'users', usersJson);
      await bulkInsert(client, 'partners', partnersJson);
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
