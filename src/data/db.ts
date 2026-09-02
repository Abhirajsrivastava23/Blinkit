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
import { resolveImageUrl } from '../utils/imageUtils';


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
const rawConnectionString = (
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  ''
).trim();

// Clean connection string using URL parser to preserve query params while removing sslmode
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

const connectionString = getSanitizedConnectionString(rawConnectionString);

let pool: Pool | null = null;
let dbInitError = '';

if (rawConnectionString) {
  try {
    const isLocal = rawConnectionString.includes('localhost') || rawConnectionString.includes('127.0.0.1');

    // Ensure Node.js TLS allows cloud provider private/self-signed CA certificate chains
    if (!isLocal && typeof process !== 'undefined') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    const globalWithPg = global as typeof globalThis & {
      _pgPool?: Pool;
    };
    if (!globalWithPg._pgPool) {
      globalWithPg._pgPool = new Pool({
        connectionString,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 10000,
        max: 20,
        ssl: isLocal ? false : {
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
  orders: [
    'id', 'customerId', 'customerEmail', 'items', 'subtotal', 'deliveryFee', 'discount', 'total',
    'address', 'status', 'deliveryOption', 'deliveryTimeSlot', 'eta', 'createdAt', 'updatedAt',
    'deliveryLocationId', 'deliveryLocationName', 'deliveryOtp', 'otpFailedAttempts', 'otpExpiresAt',
    'statusHistory', 'assignedPartnerId', 'assignedPartnerName', 'assignedAt',
    'paymentStatus', 'paymentMethod', 'paymentId', 'scheduledDeliveryAt',
    'cancellationReason', 'cancelledAt', 'delivery_otp_verified', 'otp_verified_at',
    'verified_by_partner_id', 'delivery_completed_at', 'adminOverride',
    'utr', 'proofImageUrl', 'paymentSubmittedAt', 'paymentVerifiedAt', 'paymentRejectedAt', 'rejectionReason'
  ],
  product_image_history: ['id', 'productId', 'storagePath', 'imageUrl', 'uploadedBy', 'uploadedByRole', 'uploadedAt', 'previousImage', 'isActive'],
  payment_transactions: ['id', 'orderId', 'customerId', 'amount', 'currency', 'status', 'method', 'provider', 'transactionReference', 'utr', 'proofImageUrl', 'submittedAt', 'verifiedAt', 'verifiedBy', 'rejectedAt', 'rejectedBy', 'rejectionReason', 'paymentProofType', 'paymentProofSize', 'createdAt', 'updatedAt', 'paidAt', 'failureReason', 'attemptCount', 'lastAttemptAt', 'metadata']
};

export function normalizeOrderRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  // Parse JSON fields safely if stringified
  for (const col of ['tags', 'addresses', 'items', 'statusHistory', 'address', 'adminOverride', 'metadata']) {
    const val = parsed[col];
    if (typeof val === 'string') {
      try {
        parsed[col] = JSON.parse(val);
      } catch {
        parsed[col] = val;
      }
    }
  }

  // Canonical ID normalization
  parsed.id = String(parsed.id || parsed.ID || '').trim();

  // Customer ID & email normalization
  if (parsed.customerid && !parsed.customerId) parsed.customerId = parsed.customerid;
  if (parsed.customeremail && !parsed.customerEmail) parsed.customerEmail = parsed.customeremail;

  // Delivery & Location normalization
  if (parsed.deliverylocationid && !parsed.deliveryLocationId) parsed.deliveryLocationId = parsed.deliverylocationid;
  if (parsed.deliverylocationname && !parsed.deliveryLocationName) parsed.deliveryLocationName = parsed.deliverylocationname;
  if (parsed.deliveryoption && !parsed.deliveryOption) parsed.deliveryOption = parsed.deliveryoption;
  if (parsed.deliverytimeslot && !parsed.deliveryTimeSlot) parsed.deliveryTimeSlot = parsed.deliverytimeslot;
  if (parsed.scheduleddeliveryat && !parsed.scheduledDeliveryAt) parsed.scheduledDeliveryAt = parsed.scheduleddeliveryat;
  if (parsed.deliveryfee !== undefined && parsed.deliveryFee === undefined) parsed.deliveryFee = parsed.deliveryfee;

  // Pricing numbers
  parsed.total = Number(parsed.total || 0);
  parsed.subtotal = Number(parsed.subtotal || 0);
  parsed.deliveryFee = Number(parsed.deliveryFee ?? 0);
  parsed.discount = Number(parsed.discount || 0);

  // OTP fields
  if (parsed.deliveryotp && !parsed.deliveryOtp) parsed.deliveryOtp = parsed.deliveryotp;
  if (parsed.otpfailedattempts !== undefined && parsed.otpFailedAttempts === undefined) parsed.otpFailedAttempts = Number(parsed.otpfailedattempts || 0);
  if (parsed.otpexpiresat && !parsed.otpExpiresAt) parsed.otpExpiresAt = parsed.otpexpiresat;
  if (parsed.deliveryotpverified !== undefined && parsed.delivery_otp_verified === undefined) parsed.delivery_otp_verified = Boolean(parsed.deliveryotpverified);
  if (parsed.otpverifiedat && !parsed.otp_verified_at) parsed.otp_verified_at = parsed.otpverifiedat;
  if (parsed.verifiedbypartnerid && !parsed.verified_by_partner_id) parsed.verified_by_partner_id = parsed.verifiedbypartnerid;
  if (parsed.deliverycompletedat && !parsed.delivery_completed_at) parsed.delivery_completed_at = parsed.deliverycompletedat;
  if (parsed.adminoverride && !parsed.adminOverride) parsed.adminOverride = parsed.adminoverride;

  // Assignment fields (CRITICAL CANONICAL NORMALIZATION)
  if (parsed.assignedpartnerid !== undefined && parsed.assignedPartnerId === undefined) {
    parsed.assignedPartnerId = parsed.assignedpartnerid || null;
  }
  if (parsed.assignedpartnername !== undefined && parsed.assignedPartnerName === undefined) {
    parsed.assignedPartnerName = parsed.assignedpartnername || null;
  }
  if (parsed.assignedat !== undefined && parsed.assignedAt === undefined) {
    parsed.assignedAt = parsed.assignedat || null;
  }
  if (parsed.statushistory && !parsed.statusHistory) parsed.statusHistory = parsed.statushistory;

  // Payment fields
  if (parsed.paymentstatus && !parsed.paymentStatus) parsed.paymentStatus = parsed.paymentstatus;
  if (parsed.paymentmethod && !parsed.paymentMethod) parsed.paymentMethod = parsed.paymentmethod;
  if (parsed.paymentid && !parsed.paymentId) parsed.paymentId = parsed.paymentid;
  if (parsed.proofimageurl && !parsed.proofImageUrl) parsed.proofImageUrl = parsed.proofimageurl;
  if (parsed.paymentsubmittedat && !parsed.paymentSubmittedAt) parsed.paymentSubmittedAt = parsed.paymentsubmittedat;
  if (parsed.paymentverifiedat && !parsed.paymentVerifiedAt) parsed.paymentVerifiedAt = parsed.paymentverifiedat;
  if (parsed.paymentrejectedat && !parsed.paymentRejectedAt) parsed.paymentRejectedAt = parsed.paymentrejectedat;
  if (parsed.rejectionreason && !parsed.rejectionReason) parsed.rejectionReason = parsed.rejectionreason;
  if (parsed.cancellationreason && !parsed.cancellationReason) parsed.cancellationReason = parsed.cancellationreason;
  if (parsed.cancelledat && !parsed.cancelledAt) parsed.cancelledAt = parsed.cancelledat;
  if (parsed.createdat && !parsed.createdAt) parsed.createdAt = parsed.createdat;
  if (parsed.updatedat && !parsed.updatedAt) parsed.updatedAt = parsed.updatedat;

  return parsed;
}

export function normalizePaymentRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  if (typeof parsed.metadata === 'string') {
    try {
      parsed.metadata = JSON.parse(parsed.metadata);
    } catch {
      // keep string
    }
  }

  if (parsed.orderid && !parsed.orderId) parsed.orderId = parsed.orderid;
  if (parsed.customerid && !parsed.customerId) parsed.customerId = parsed.customerid;
  if (parsed.transactionreference && !parsed.transactionReference) parsed.transactionReference = parsed.transactionreference;
  if (parsed.proofimageurl && !parsed.proofImageUrl) parsed.proofImageUrl = parsed.proofimageurl;
  if (parsed.submittedat && !parsed.submittedAt) parsed.submittedAt = parsed.submittedat;
  if (parsed.verifiedat && !parsed.verifiedAt) parsed.verifiedAt = parsed.verifiedat;
  if (parsed.verifiedby && !parsed.verifiedBy) parsed.verifiedBy = parsed.verifiedby;
  if (parsed.rejectedat && !parsed.rejectedAt) parsed.rejectedAt = parsed.rejectedat;
  if (parsed.rejectedby && !parsed.rejectedBy) parsed.rejectedBy = parsed.rejectedby;
  if (parsed.rejectionreason && !parsed.rejectionReason) parsed.rejectionReason = parsed.rejectionreason;
  if (parsed.paymentprooftype && !parsed.paymentProofType) parsed.paymentProofType = parsed.paymentprooftype;
  if (parsed.paymentproofsize !== undefined && parsed.paymentProofSize === undefined) parsed.paymentProofSize = parsed.paymentproofsize;
  if (parsed.createdat && !parsed.createdAt) parsed.createdAt = parsed.createdat;
  if (parsed.updatedat && !parsed.updatedAt) parsed.updatedAt = parsed.updatedat;
  if (parsed.paidat && !parsed.paidAt) parsed.paidAt = parsed.paidat;
  if (parsed.failurereason && !parsed.failureReason) parsed.failureReason = parsed.failurereason;
  if (parsed.attemptcount !== undefined && parsed.attemptCount === undefined) parsed.attemptCount = Number(parsed.attemptcount || 0);
  if (parsed.lastattemptat && !parsed.lastAttemptAt) parsed.lastAttemptAt = parsed.lastattemptat;

  parsed.amount = Number(parsed.amount || 0);

  return parsed;
}

export function normalizePartnerRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  if (parsed.passwordhash && !parsed.passwordHash) parsed.passwordHash = parsed.passwordhash;
  if (parsed.locationid && !parsed.locationId) parsed.locationId = parsed.locationid;
  if (parsed.locationname && !parsed.locationName) parsed.locationName = parsed.locationname;
  if (parsed.isonline !== undefined && parsed.isOnline === undefined) parsed.isOnline = Boolean(parsed.isonline);

  return parsed;
}

export function normalizeUserRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  if (typeof parsed.addresses === 'string') {
    try {
      parsed.addresses = JSON.parse(parsed.addresses);
    } catch {
      // keep
    }
  }

  if (parsed.userid && !parsed.userId) parsed.userId = parsed.userid;
  if (parsed.googleproviderid && !parsed.googleProviderId) parsed.googleProviderId = parsed.googleproviderid;
  if (parsed.profileimage && !parsed.profileImage) parsed.profileImage = parsed.profileimage;
  if (parsed.createdat && !parsed.createdAt) parsed.createdAt = parsed.createdat;
  if (parsed.lastloginat && !parsed.lastLoginAt) parsed.lastLoginAt = parsed.lastloginat;
  if (parsed.wellnessaccessstatus && !parsed.wellnessAccessStatus) parsed.wellnessAccessStatus = parsed.wellnessaccessstatus;
  if (parsed.wellnessrequestid && !parsed.wellnessRequestId) parsed.wellnessRequestId = parsed.wellnessrequestid;
  if (parsed.wellnessapprovedat && !parsed.wellnessApprovedAt) parsed.wellnessApprovedAt = parsed.wellnessapprovedat;
  if (parsed.wellnessapprovedby && !parsed.wellnessApprovedBy) parsed.wellnessApprovedBy = parsed.wellnessapprovedby;

  return parsed;
}

export function normalizeSessionRecord(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const parsed: Record<string, unknown> = { ...row };

  if (parsed.sessionid && !parsed.sessionId) parsed.sessionId = parsed.sessionid;
  if (parsed.userid && !parsed.userId) parsed.userId = parsed.userid;
  if (parsed.expiresat && !parsed.expiresAt) parsed.expiresAt = parsed.expiresat;

  return parsed;
}

async function insertRow(p: Pool, table: string, item: Record<string, unknown>) {
  const allowed = ALLOWED_COLUMNS[table];
  const allowedLowerMap = new Map<string, string>();
  for (const col of allowed || []) {
    allowedLowerMap.set(col.toLowerCase(), col);
  }

  const cols: string[] = [];
  const vals: string[] = [];
  const queryVals: unknown[] = [];

  for (const [k, rawV] of Object.entries(item)) {
    const canonicalCol = allowedLowerMap.get(k.toLowerCase());
    if (!canonicalCol) continue;
    if (cols.includes(`"${canonicalCol}"`)) continue;

    cols.push(`"${canonicalCol}"`);
    queryVals.push(rawV && typeof rawV === 'object' ? JSON.stringify(rawV) : rawV);
    vals.push(`$${queryVals.length}`);
  }

  if (cols.length === 0) return;
  const queryText = `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING`;
  await p.query(queryText, queryVals);
}

async function bulkInsert(client: PoolClient, table: string, items: Record<string, unknown>[]) {
  if (items.length === 0) return;
  const allowed = ALLOWED_COLUMNS[table];
  const allowedLowerMap = new Map<string, string>();
  for (const col of allowed || []) {
    allowedLowerMap.set(col.toLowerCase(), col);
  }

  for (const item of items) {
    const cols: string[] = [];
    const vals: string[] = [];
    const queryVals: unknown[] = [];

    for (const [k, rawV] of Object.entries(item)) {
      const canonicalCol = allowedLowerMap.get(k.toLowerCase());
      if (!canonicalCol) continue;
      if (cols.includes(`"${canonicalCol}"`)) continue;

      cols.push(`"${canonicalCol}"`);
      queryVals.push(rawV && typeof rawV === 'object' ? JSON.stringify(rawV) : rawV);
      vals.push(`$${queryVals.length}`);
    }

    if (cols.length === 0) continue;
    const queryText = `INSERT INTO "${table}" (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING`;
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
      if (lower.includes('insert into payment_transactions') && params && params.length >= 2) {
        const id = String(params[0]);
        const orderId = String(params[1]);
        const customerId = params[2] ? String(params[2]) : '';
        const amount = Number(params[3] || 0);
        const status = params[5] ? String(params[5]) : 'PENDING';
        const utr = params[8] ? String(params[8]) : (params[6] ? String(params[6]) : '');
        const proofImageUrl = params[9] ? String(params[9]) : '';
        const submittedAt = params[10] ? String(params[10]) : new Date().toISOString();

        const list = inMemoryData['payment_transactions'] || [];
        const existingIdx = list.findIndex(p => String(p.orderId || p.orderid).toLowerCase() === orderId.toLowerCase() || String(p.id).toLowerCase() === id.toLowerCase());
        const record: Record<string, unknown> = {
          id,
          orderId,
          customerId,
          amount,
          currency: 'INR',
          status,
          method: 'UPI',
          provider: 'MANUAL_UPI',
          utr,
          proofImageUrl,
          submittedAt,
          createdAt: submittedAt,
          updatedAt: submittedAt,
          attemptCount: 1
        };

        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...record };
        } else {
          list.push(record);
        }
        inMemoryData['payment_transactions'] = list;
        return { rows: [record as T] };
      }
      if (lower.includes('select') && lower.includes('orders') && (lower.includes('id =') || lower.includes('lower(id) =') || lower.includes('id) =')) && params && params[0]) {
        const orderId = String(params[0]).toLowerCase();
        const list = inMemoryData['orders'] || [];
        const found = list.filter((o: Record<string, unknown>) => String(o.id || o.ID || '').toLowerCase() === orderId);
        return { rows: found.map(normalizeOrderRecord) as T[] };
      }
      if (lower.includes('select') && lower.includes('payment_transactions') && params && params[0]) {
        const idVal = String(params[0]).toLowerCase();
        const list = inMemoryData['payment_transactions'] || [];
        const found = list.filter((p: Record<string, unknown>) => String(p.id || '').toLowerCase() === idVal || String(p.orderId || p.orderid || '').toLowerCase() === idVal);
        return { rows: found.map(normalizePaymentRecord) as T[] };
      }
      if (lower.includes('update payment_transactions') && params) {
        const list = inMemoryData['payment_transactions'] || [];
        const statusVal = String(params[0] || 'PAID');
        const lastParam = String(params[params.length - 1] || '').toLowerCase();
        for (let i = 0; i < list.length; i++) {
          if (String(list[i].id || '').toLowerCase() === lastParam || String(list[i].orderId || '').toLowerCase() === lastParam) {
            list[i].status = statusVal;
            list[i].updatedAt = new Date().toISOString();
            if (statusVal === 'PAID') {
              list[i].paidAt = list[i].updatedAt;
              if (params[1]) list[i].verifiedAt = String(params[1]);
              if (params[2]) list[i].verifiedBy = String(params[2]);
            }
            if (statusVal === 'REJECTED') {
              if (params[1]) list[i].rejectedAt = String(params[1]);
              if (params[2]) list[i].rejectedBy = String(params[2]);
              if (params[3]) list[i].rejectionReason = String(params[3]);
            }
          }
        }
        return { rows: [] };
      }
      if (lower.includes('insert into sessions') && params && params.length >= 5) {
        const sessionId = String(params[0]);
        const userId = String(params[1]);
        const email = String(params[2]);
        const role = String(params[3]);
        const expiresAt = String(params[4]);

        const list = inMemoryData['sessions'] || [];
        const existingIdx = list.findIndex(s => String(s.sessionId || s.sessionid).toLowerCase() === sessionId.toLowerCase());
        const record = { sessionId, userId, email, role, expiresAt };
        if (existingIdx >= 0) {
          list[existingIdx] = record;
        } else {
          list.push(record);
        }
        inMemoryData['sessions'] = list;
        return { rows: [record as unknown as T] };
      }
      if (lower.includes('select') && lower.includes('sessions') && params && params[0]) {
        const token = String(params[0]).toLowerCase();
        const list = inMemoryData['sessions'] || [];
        const found = list.filter((s: Record<string, unknown>) => String(s.sessionId || s.sessionid || '').toLowerCase() === token);
        return { rows: found.map(normalizeSessionRecord) as unknown as T[] };
      }
      if (lower.includes('delete from sessions') && params && params[0]) {
        const token = String(params[0]).toLowerCase();
        const list = inMemoryData['sessions'] || [];
        inMemoryData['sessions'] = list.filter((s: Record<string, unknown>) => String(s.sessionId || s.sessionid || '').toLowerCase() !== token);
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
      const memList = (inMemoryData[key] || []) as unknown as Record<string, unknown>[];
      if (key === 'orders') return memList.map(normalizeOrderRecord) as unknown as T[];
      if (key === 'payment_transactions') return memList.map(normalizePaymentRecord) as unknown as T[];
      if (key === 'partners') return memList.map(normalizePartnerRecord) as unknown as T[];
      if (key === 'users') return memList.map(normalizeUserRecord) as unknown as T[];
      if (key === 'sessions') return memList.map(normalizeSessionRecord) as unknown as T[];
      return memList as unknown as T[];
    }
    
    try {
      const tableName = key === 'inventoryIssues' ? 'inventoryIssues' : key === 'auditLogs' ? 'auditLogs' : key === 'product_image_history' ? 'product_image_history' : key === 'payment_transactions' ? 'payment_transactions' : key;
      const res = await pool.query(`SELECT * FROM "${tableName}"`);
      
      return res.rows.map(row => {
        let parsed: Record<string, unknown> = {};
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

        if (key === 'orders') {
          parsed = normalizeOrderRecord(parsed);
        } else if (key === 'payment_transactions') {
          parsed = normalizePaymentRecord(parsed);
        } else if (key === 'partners') {
          parsed = normalizePartnerRecord(parsed);
        } else if (key === 'users') {
          parsed = normalizeUserRecord(parsed);
        } else if (key === 'sessions') {
          parsed = normalizeSessionRecord(parsed);
        } else if (key === 'products') {
          parsed.image = resolveImageUrl(parsed.image as string, parsed.category as string);
        } else if (key === 'categories') {
          parsed.image = resolveImageUrl(parsed.image as string, parsed.id as string);
        }

        return parsed;
      }) as unknown as T[];
    } catch (err) {
      console.error(`PostgreSQL error reading table ${key}:`, err);
      const memList = (inMemoryData[key] || []) as unknown as Record<string, unknown>[];
      if (key === 'orders') return memList.map(normalizeOrderRecord) as unknown as T[];
      if (key === 'payment_transactions') return memList.map(normalizePaymentRecord) as unknown as T[];
      if (key === 'partners') return memList.map(normalizePartnerRecord) as unknown as T[];
      if (key === 'users') return memList.map(normalizeUserRecord) as unknown as T[];
      if (key === 'sessions') return memList.map(normalizeSessionRecord) as unknown as T[];
      return memList as unknown as T[];
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
      
      const allowed = ALLOWED_COLUMNS[key];
      const allowedLowerMap = new Map<string, string>();
      for (const col of allowed || []) {
        allowedLowerMap.set(col.toLowerCase(), col);
      }

      for (const item of data) {
        const record = item as Record<string, unknown>;
        const cols: string[] = [];
        const vals: string[] = [];
        const queryVals: unknown[] = [];

        for (const [k, rawV] of Object.entries(record)) {
          const canonicalCol = allowedLowerMap.get(k.toLowerCase());
          if (!canonicalCol) continue;
          if (cols.includes(`"${canonicalCol}"`)) continue;

          cols.push(`"${canonicalCol}"`);
          queryVals.push(rawV && typeof rawV === 'object' ? JSON.stringify(rawV) : rawV);
          vals.push(`$${queryVals.length}`);
        }

        if (cols.length === 0) continue;
        const queryText = `INSERT INTO "${tableName}" (${cols.join(', ')}) VALUES (${vals.join(', ')})`;
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
   * Dedicated Single Order Retrieval & Mutation Methods
   */
  async getOrderById(orderId: string): Promise<Record<string, unknown> | null> {
    const rawId = String(orderId || '').trim();
    if (!rawId || rawId === 'undefined' || rawId === 'null') return null;
    const cleanId = rawId.replace(/^#+/, '').trim();

    if (pool) {
      try {
        const res = await pool.query(
          'SELECT * FROM orders WHERE LOWER(TRIM(id)) = LOWER(TRIM($1)) OR LOWER(TRIM(id)) = LOWER(TRIM($2)) LIMIT 1',
          [cleanId, rawId]
        );
        if (res.rows.length > 0) {
          const normalized = normalizeOrderRecord(res.rows[0]);
          const list = inMemoryData['orders'] || [];
          const idx = list.findIndex(o => String(o.id || o.ID || '').replace(/^#+/, '').trim().toLowerCase() === cleanId.toLowerCase());
          if (idx >= 0) list[idx] = normalized;
          else list.unshift(normalized);
          inMemoryData['orders'] = list;
          return normalized;
        }

        // Secondary fallback for IDs with varying FT- / # prefixes
        const rawNumeric = cleanId.replace(/\D/g, '');
        if (rawNumeric.length >= 4) {
          const fallbackRes = await pool.query(
            `SELECT * FROM orders WHERE id LIKE '%' || $1 || '%' LIMIT 1`,
            [rawNumeric]
          );
          if (fallbackRes.rows.length > 0) {
            const normalized = normalizeOrderRecord(fallbackRes.rows[0]);
            return normalized;
          }
        }
      } catch (err) {
        console.error(`[DATABASE ERROR] getOrderById query failed for ID "${cleanId}":`, err);
      }
    }

    const list = inMemoryData['orders'] || [];
    const found = list.find(o => {
      const oid = String(o.id || o.ID || '').replace(/^#+/, '').trim().toLowerCase();
      return oid === cleanId.toLowerCase() || oid === rawId.toLowerCase() || (rawId.replace(/\D/g, '').length >= 4 && oid.includes(rawId.replace(/\D/g, '')));
    });
    return found ? normalizeOrderRecord(found) : null;
  },

  async updateOrder(orderId: string, updates: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const rawId = String(orderId || '').trim();
    if (!rawId) return null;
    const cleanId = rawId.replace(/^#+/, '').trim();

    const list = inMemoryData['orders'] || [];
    const idx = list.findIndex(o => String(o.id || o.ID || '').replace(/^#+/, '').trim().toLowerCase() === cleanId.toLowerCase());
    const now = new Date().toISOString();
    const cleanUpdates = { ...updates, id: cleanId, updatedAt: updates.updatedAt || now };

    let merged: Record<string, unknown>;
    if (idx >= 0) {
      merged = normalizeOrderRecord({ ...list[idx], ...cleanUpdates });
      list[idx] = merged;
    } else {
      merged = normalizeOrderRecord({ ...cleanUpdates, id: cleanId });
      list.unshift(merged);
    }
    inMemoryData['orders'] = list;

    if (!pool) {
      return merged;
    }

    try {
      const allowedOrderCols = ALLOWED_COLUMNS['orders'];
      const allowedLowerMap = new Map<string, string>();
      for (const col of allowedOrderCols) {
        allowedLowerMap.set(col.toLowerCase(), col);
      }

      // 1. Attempt UPDATE first
      const setClauses: string[] = [];
      const values: unknown[] = [];

      for (const [key, val] of Object.entries(cleanUpdates)) {
        if (key.toLowerCase() === 'id') continue;
        const canonicalCol = allowedLowerMap.get(key.toLowerCase());
        if (!canonicalCol) continue;

        values.push(val && typeof val === 'object' ? JSON.stringify(val) : val);
        setClauses.push(`"${canonicalCol}" = $${values.length}`);
      }

      let updatedRows = 0;
      if (setClauses.length > 0) {
        values.push(cleanId);
        const queryText = `UPDATE orders SET ${setClauses.join(', ')} WHERE LOWER(id) = LOWER($${values.length})`;
        const res = await pool.query(queryText, values);
        updatedRows = res.rowCount || 0;
      }

      // 2. If row was not found in DB, perform atomic INSERT
      if (updatedRows === 0) {
        const cols: string[] = ['"id"'];
        const valPlaceholders: string[] = ['$1'];
        const insertVals: unknown[] = [cleanId];

        for (const [key, val] of Object.entries(merged)) {
          if (key.toLowerCase() === 'id') continue;
          const canonicalCol = allowedLowerMap.get(key.toLowerCase());
          if (!canonicalCol) continue;

          cols.push(`"${canonicalCol}"`);
          insertVals.push(val && typeof val === 'object' ? JSON.stringify(val) : val);
          valPlaceholders.push(`$${insertVals.length}`);
        }

        const insertQuery = `INSERT INTO orders (${cols.join(', ')}) VALUES (${valPlaceholders.join(', ')}) ON CONFLICT (id) DO NOTHING`;
        await pool.query(insertQuery, insertVals);
      }

      return merged;
    } catch (err) {
      console.error('Error updating order row in database:', err);
      return merged;
    }
  },

  /**
   * Payment Transaction Methods
   */
  async getPaymentByOrderId(orderId: string): Promise<Record<string, unknown> | null> {
    if (!pool) {
      const list = inMemoryData['payment_transactions'] || [];
      const found = list.find((p: Record<string, unknown>) => String(p.orderId || p.orderid).toLowerCase() === String(orderId).toLowerCase());
      return found ? normalizePaymentRecord(found) : null;
    }
    try {
      const res = await pool.query(
        'SELECT * FROM payment_transactions WHERE LOWER("orderId") = LOWER($1) LIMIT 1',
        [orderId]
      );
      if (res.rows.length === 0) return null;
      return normalizePaymentRecord(res.rows[0]);
    } catch (err) {
      console.error('Error fetching payment by orderId:', err);
      const list = inMemoryData['payment_transactions'] || [];
      const found = list.find((p: Record<string, unknown>) => String(p.orderId || p.orderid).toLowerCase() === String(orderId).toLowerCase());
      return found ? normalizePaymentRecord(found) : null;
    }
  },

  async getPaymentById(paymentId: string): Promise<Record<string, unknown> | null> {
    if (!pool) {
      const list = inMemoryData['payment_transactions'] || [];
      const found = list.find((p: Record<string, unknown>) => String(p.id).toLowerCase() === String(paymentId).toLowerCase());
      return found ? normalizePaymentRecord(found) : null;
    }
    try {
      const res = await pool.query(
        'SELECT * FROM payment_transactions WHERE LOWER(id) = LOWER($1) LIMIT 1',
        [paymentId]
      );
      if (res.rows.length === 0) return null;
      return normalizePaymentRecord(res.rows[0]);
    } catch (err) {
      console.error('Error fetching payment by id:', err);
      const list = inMemoryData['payment_transactions'] || [];
      const found = list.find((p: Record<string, unknown>) => String(p.id).toLowerCase() === String(paymentId).toLowerCase());
      return found ? normalizePaymentRecord(found) : null;
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

      query += ` WHERE LOWER(id) = LOWER($${params.length + 1}) OR LOWER("orderId") = LOWER($${params.length + 1})`;
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

  async getConfig<T = unknown>(key: string): Promise<T | null> {
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

  async setConfig<T = unknown>(key: string, data: T): Promise<boolean> {
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
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveryTimeSlot" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "delivery_otp_verified" BOOLEAN DEFAULT FALSE');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "otp_verified_at" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "verified_by_partner_id" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "delivery_completed_at" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "adminOverride" JSONB');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentId" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS utr VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "proofImageUrl" TEXT');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentSubmittedAt" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentVerifiedAt" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentRejectedAt" VARCHAR(255)');
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT');

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
